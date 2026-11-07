<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ServiceChargePaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceChargeResource;
use App\Models\Client;
use App\Models\RentalAgreement;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use App\Models\ServiceChargePayment;
use App\Services\TenantManager;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ServiceChargeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['unpaid_pending', 'partial', 'non_payment', 'paid', 'due', 'overdue'])],
            'month' => ['sometimes', 'date_format:Y-m'],
            'property_id' => ['sometimes', 'integer', 'exists:rental_properties,id'],
            'client_id' => ['sometimes', 'integer', 'exists:clients,id'],
            'category_id' => ['sometimes', 'integer', 'exists:service_charge_categories,id'],
            'rental_id' => ['sometimes', 'integer', 'exists:rental_agreements,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $charges = ServiceCharge::query()
            ->with(['category', 'rentalAgreement', 'rentalProperty.property', 'client', 'payments' => fn ($query) => $query->with(['recorder', 'approver'])->where('status', ServiceChargePaymentStatus::Confirmed->value)->latest('paid_at')->limit(1)])
            ->withSum([
                'payments as amount_paid' => fn ($query) => $query->where(
                    'status',
                    ServiceChargePaymentStatus::Confirmed->value
                ),
            ], 'amount')
            ->when($validated['month'] ?? now()->format('Y-m'), function ($query, string $month) {
                $start = $month.'-01';
                $query->where(function ($query) use ($month, $start) {
                    $query->where('billing_month', $month)
                        ->orWhere(function ($query) use ($start) {
                            $query->whereNull('billing_month')->whereDate('billing_period_start', '>=', $start)
                                ->whereDate('billing_period_start', '<=', date('Y-m-t', strtotime($start)));
                        });
                });
            })
            ->when($validated['property_id'] ?? null, fn ($query, int $id) => $query->where('rental_property_id', $id))
            ->when($validated['client_id'] ?? null, fn ($query, int $id) => $query->where('client_id', $id))
            ->when(
                $validated['category_id'] ?? null,
                fn ($query, int $categoryId) => $query->where('category_id', $categoryId)
            )
            ->when(
                $validated['rental_id'] ?? null,
                fn ($query, int $rentalId) => $query->where('rental_agreement_id', $rentalId)
            )
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('description', 'like', "%{$search}%")
                        ->orWhereHas('category', fn ($query) => $query->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('client', function ($query) use ($search) {
                            $query->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        })
                        ->orWhereHas('rentalProperty', function ($query) use ($search) {
                            $query->where('name', 'like', "%{$search}%")
                                ->orWhere('location', 'like', "%{$search}%")
                                ->orWhereHas('property', function ($query) use ($search) {
                                    $query->where('title', 'like', "%{$search}%")
                                        ->orWhere('location', 'like', "%{$search}%");
                                });
                        });
                });
            })
            ->when($validated['status'] ?? null, fn ($query, string $status) => $this->filterByStatus($query, $status))
            ->latest('billing_date')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        $month = $validated['month'] ?? now()->format('Y-m');
        $monthStart = $month.'-01';
        $monthEnd = date('Y-m-t', strtotime($monthStart));
        $confirmedPayments = ServiceChargePayment::query()
            ->select('service_charge_id')
            ->selectRaw('SUM(amount) AS confirmed_amount_paid')
            ->where('status', ServiceChargePaymentStatus::Confirmed->value)
            ->groupBy('service_charge_id');
        $summary = ServiceCharge::query()
            ->leftJoinSub($confirmedPayments, 'confirmed_service_charge_payments', function ($join) {
                $join->on('confirmed_service_charge_payments.service_charge_id', '=', 'service_charges.id');
            })
            ->where(function ($query) use ($month, $monthStart, $monthEnd) {
                $query->where('billing_month', $month)
                    ->orWhere(function ($query) use ($monthStart, $monthEnd) {
                        $query->whereNull('billing_month')
                            ->whereDate('billing_period_start', '>=', $monthStart)
                            ->whereDate('billing_period_start', '<=', $monthEnd);
                    });
            })
            ->selectRaw('COALESCE(SUM(service_charges.amount_due), 0) AS amount_billed')
            ->selectRaw('COALESCE(SUM(COALESCE(confirmed_service_charge_payments.confirmed_amount_paid, 0)), 0) AS amount_collected')
            ->selectRaw('COALESCE(SUM(CASE WHEN service_charges.amount_due > COALESCE(confirmed_service_charge_payments.confirmed_amount_paid, 0) THEN service_charges.amount_due - COALESCE(confirmed_service_charge_payments.confirmed_amount_paid, 0) ELSE 0 END), 0) AS outstanding_balance')
            ->first();

        return ServiceChargeResource::collection($charges)->additional([
            'summary' => [
                'month' => $month,
                'amount_billed' => (float) $summary->amount_billed,
                'amount_collected' => (float) $summary->amount_collected,
                'outstanding_balance' => (float) $summary->outstanding_balance,
            ],
        ]);
    }

    public function formOptions(): JsonResponse
    {
        return response()->json([
            'data' => [
                'categories' => ServiceChargeCategory::query()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'monthly_amount']),
                'tenants' => Client::query()->whereHas('serviceCharges')->orderBy('first_name')->get(['id', 'first_name', 'last_name']),
                'properties' => RentalProperty::query()->whereHas('serviceCharges')->orderBy('name')->get(['id', 'name', 'location']),
                'rentals' => RentalAgreement::query()
                    ->with(['client', 'rentalProperty.property'])
                    ->where('status', 'active')
                    ->orderByDesc('id')
                    ->limit(100)
                    ->get()
                    ->map(fn (RentalAgreement $rental) => [
                        'id' => $rental->id,
                        'rental_property_id' => $rental->rental_property_id,
                        'client_id' => $rental->client_id,
                        'client_name' => $rental->client?->full_name,
                        'property_name' => $rental->rentalProperty?->name ?: $rental->rentalProperty?->property?->title,
                        'property_location' => $rental->rentalProperty?->location ?: $rental->rentalProperty?->property?->location,
                        'lease_start_date' => $rental->lease_start_date?->toDateString(),
                        'lease_end_date' => $rental->lease_end_date?->toDateString(),
                    ]),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedData($request);
        $charge = DB::transaction(function () use ($data): ServiceCharge {
            $rental = RentalAgreement::query()
                ->with('rentalProperty')
                ->where('status', 'active')
                ->lockForUpdate()
                ->findOrFail($data['rental_agreement_id']);
            Client::query()->whereKey($rental->client_id)->lockForUpdate()->firstOrFail();
            $this->ensureBillingMonthAvailable($rental, $data['category_id'], $data['billing_period_start'], $data['billing_period_end']);

            return $rental->serviceCharges()->create([
                'category_id' => $data['category_id'],
                'rental_property_id' => $rental->rental_property_id,
                'client_id' => $rental->client_id,
                'description' => $data['description'] ?? null,
                'billing_period_start' => $data['billing_period_start'],
                'billing_period_end' => $data['billing_period_end'],
                'billing_month' => $data['billing_month'],
                'billing_date' => $data['billing_date'],
                'due_date' => $data['billing_period_start'],
                'amount_due' => $data['amount_due'],
                'notes' => $data['notes'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Service charge created successfully.',
            'data' => [
                'service_charge' => new ServiceChargeResource($charge->load([
                    'category',
                    'rentalAgreement',
                    'rentalProperty.property',
                    'client',
                    'payments',
                ])),
            ],
        ], 201);
    }

    public function show(ServiceCharge $serviceCharge): JsonResponse
    {
        return response()->json([
            'data' => [
                'service_charge' => new ServiceChargeResource($serviceCharge->load([
                    'category',
                    'rentalAgreement',
                    'rentalProperty.property',
                    'client',
                    'payments' => fn ($query) => $query->with(['recorder', 'approver', 'receipt'])->latest('paid_at'),
                ])->setAttribute('amount_paid', $serviceCharge->confirmedAmountPaid())),
            ],
        ]);
    }

    public function update(Request $request, ServiceCharge $serviceCharge): JsonResponse
    {
        $data = $this->validatedData($request);
        $serviceCharge = DB::transaction(function () use ($data, $serviceCharge): ServiceCharge {
            $charge = ServiceCharge::query()->lockForUpdate()->findOrFail($serviceCharge->id);
            if ($charge->payments()->exists()) {
                throw ValidationException::withMessages([
                    'service_charge' => ['A service charge cannot be changed after payment history has been recorded.'],
                ]);
            }

            $rental = RentalAgreement::query()
                ->where('status', 'active')
                ->lockForUpdate()
                ->findOrFail($data['rental_agreement_id']);
            Client::query()->whereKey($rental->client_id)->lockForUpdate()->firstOrFail();
            $this->ensureBillingMonthAvailable($rental, $data['category_id'], $data['billing_period_start'], $data['billing_period_end'], $charge->id);
            $charge->update([
                'category_id' => $data['category_id'],
                'rental_agreement_id' => $rental->id,
                'rental_property_id' => $rental->rental_property_id,
                'client_id' => $rental->client_id,
                'description' => $data['description'] ?? null,
                'billing_period_start' => $data['billing_period_start'],
                'billing_period_end' => $data['billing_period_end'],
                'billing_month' => $data['billing_month'],
                'billing_date' => $data['billing_date'],
                'due_date' => $data['billing_period_start'],
                'amount_due' => $data['amount_due'],
                'notes' => $data['notes'] ?? null,
            ]);

            return $charge;
        });

        return response()->json([
            'message' => 'Service charge updated successfully.',
            'data' => [
                'service_charge' => new ServiceChargeResource($serviceCharge->fresh()->load([
                    'category',
                    'rentalAgreement',
                    'rentalProperty.property',
                    'client',
                    'payments',
                ])),
            ],
        ]);
    }

    public function destroy(ServiceCharge $serviceCharge): JsonResponse
    {
        $serviceCharge->delete();

        return response()->json(['message' => 'Service charge deleted successfully.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        $tenantId = app(TenantManager::class)->currentId();
        $tenantConstraint = static fn ($query) => $tenantId === null
            ? $query
            : $query->where('tenant_id', $tenantId);

        $data = $request->validate([
            'category_id' => [
                'required',
                'integer',
                Rule::exists('service_charge_categories', 'id')
                    ->where($tenantConstraint)
                    ->whereNull('deleted_at')
                    ->where('is_active', true),
            ],
            'rental_agreement_id' => [
                'required',
                'integer',
                Rule::exists('rental_agreements', 'id')
                    ->where($tenantConstraint)
                    ->where('status', 'active')
                    ->whereNull('deleted_at'),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'billing_month' => ['required', 'date_format:Y-m'],
            'billing_date' => ['required', 'date'],
            'amount_due' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'notes' => ['nullable', 'string'],
        ]);

        $rental = RentalAgreement::query()->findOrFail($data['rental_agreement_id']);
        $month = CarbonImmutable::createFromFormat('Y-m', $data['billing_month']);
        $periodStart = $month->startOfMonth()->toDateString();
        $periodEnd = $month->endOfMonth()->toDateString();
        $data['billing_period_start'] = $periodStart;
        $data['billing_period_end'] = $periodEnd;

        if ($periodEnd < $rental->lease_start_date->toDateString()
            || $periodStart > $rental->lease_end_date->toDateString()) {
            throw ValidationException::withMessages([
                'billing_month' => ['The billing month must overlap the rental lease dates.'],
            ]);
        }

        if ($data['billing_date'] < $periodStart || $data['billing_date'] > $periodEnd) {
            throw ValidationException::withMessages([
                'billing_date' => ['The billing date must fall within the selected billing month.'],
            ]);
        }

        return $data;
    }

    private function filterByStatus($query, string $status)
    {
        $confirmedSum = '(SELECT COALESCE(SUM(service_charge_payments.amount), 0) FROM service_charge_payments'
            .' WHERE service_charge_payments.service_charge_id = service_charges.id'
            .' AND service_charge_payments.status = ?)';

        return match ($status) {
            'paid' => $query->whereRaw($confirmedSum.' >= service_charges.amount_due', [
                ServiceChargePaymentStatus::Confirmed->value,
            ]),
            'overdue', 'non_payment' => $query
                ->whereDate('due_date', '<', now()->toDateString())
                ->whereRaw($confirmedSum.' = 0', [ServiceChargePaymentStatus::Confirmed->value]),
            'partial' => $query
                ->whereRaw($confirmedSum.' > 0', [ServiceChargePaymentStatus::Confirmed->value])
                ->whereRaw($confirmedSum.' < service_charges.amount_due', [ServiceChargePaymentStatus::Confirmed->value]),
            'due', 'unpaid_pending' => $query
                ->whereDate('due_date', '>=', now()->toDateString())
                ->whereRaw($confirmedSum.' < service_charges.amount_due', [ServiceChargePaymentStatus::Confirmed->value])
                ->whereRaw($confirmedSum.' = 0', [ServiceChargePaymentStatus::Confirmed->value]),
            default => $query
                ->whereDate('due_date', '<', now()->toDateString())
                ->whereRaw($confirmedSum.' < service_charges.amount_due', [ServiceChargePaymentStatus::Confirmed->value]),
        };
    }

    private function ensureBillingMonthAvailable(
        RentalAgreement $rental,
        int $categoryId,
        string $periodStart,
        string $periodEnd,
        ?int $exceptId = null
    ): void {
        if (substr($periodStart, 0, 7) !== substr($periodEnd, 0, 7)) {
            return;
        }

        $duplicate = ServiceCharge::withTrashed()
            ->where('tenant_id', $rental->tenant_id)
            ->where('client_id', $rental->client_id)
            ->where('category_id', $categoryId)
            ->where(function ($query) use ($periodStart): void {
                $month = substr($periodStart, 0, 7);
                $query->where('billing_month', $month)
                    ->orWhere(function ($legacy) use ($month): void {
                        $legacy->whereNull('billing_month')
                            ->whereDate('billing_period_start', '>=', $month.'-01')
                            ->whereDate('billing_period_start', '<=', date('Y-m-t', strtotime($month.'-01')));
                    });
            })
            ->when($exceptId, fn ($query) => $query->where('id', '!=', $exceptId))
            ->exists();

        if ($duplicate) {
            throw ValidationException::withMessages([
                'billing_month' => ['A service charge already exists for this tenant, category, and billing month.'],
            ]);
        }
    }
}
