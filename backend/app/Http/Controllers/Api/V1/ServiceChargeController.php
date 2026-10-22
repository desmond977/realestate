<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ServiceChargePaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceChargeResource;
use App\Models\RentalAgreement;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use App\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ServiceChargeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['due', 'partial', 'overdue', 'paid'])],
            'category_id' => ['sometimes', 'integer', 'exists:service_charge_categories,id'],
            'rental_id' => ['sometimes', 'integer', 'exists:rental_agreements,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $charges = ServiceCharge::query()
            ->with(['category', 'rentalAgreement', 'rentalProperty.property', 'client'])
            ->withSum([
                'payments as amount_paid' => fn ($query) => $query->where(
                    'status',
                    ServiceChargePaymentStatus::Confirmed->value
                ),
            ], 'amount')
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

        return ServiceChargeResource::collection($charges);
    }

    public function formOptions(): JsonResponse
    {
        ServiceChargeCategory::ensureDefaults();

        return response()->json([
            'data' => [
                'categories' => ServiceChargeCategory::query()->orderBy('name')->get(['id', 'name']),
                'rentals' => RentalAgreement::query()
                    ->with(['client', 'rentalProperty.property'])
                    ->where('status', 'active')
                    ->orderByDesc('id')
                    ->limit(100)
                    ->get()
                    ->map(fn (RentalAgreement $rental) => [
                        'id' => $rental->id,
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
        $rental = RentalAgreement::query()
            ->with('rentalProperty')
            ->where('status', 'active')
            ->findOrFail($data['rental_agreement_id']);

        $charge = $rental->serviceCharges()->create([
            'category_id' => $data['category_id'],
            'rental_property_id' => $rental->rental_property_id,
            'client_id' => $rental->client_id,
            'description' => $data['description'] ?? null,
            'billing_period_start' => $data['billing_period_start'],
            'billing_period_end' => $data['billing_period_end'],
            'billing_date' => $data['billing_date'],
            'due_date' => $data['due_date'],
            'amount_due' => $data['amount_due'],
            'notes' => $data['notes'] ?? null,
        ]);

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
                    'payments' => fn ($query) => $query->with(['recorder', 'receipt'])->latest('paid_at'),
                ])->setAttribute('amount_paid', $serviceCharge->confirmedAmountPaid())),
            ],
        ]);
    }

    public function update(Request $request, ServiceCharge $serviceCharge): JsonResponse
    {
        if ($serviceCharge->payments()->exists()) {
            throw ValidationException::withMessages([
                'service_charge' => ['A service charge cannot be changed after payment history has been recorded.'],
            ]);
        }

        $data = $this->validatedData($request);
        $rental = RentalAgreement::query()->findOrFail($data['rental_agreement_id']);
        $serviceCharge->update([
            'category_id' => $data['category_id'],
            'rental_agreement_id' => $rental->id,
            'rental_property_id' => $rental->rental_property_id,
            'client_id' => $rental->client_id,
            'description' => $data['description'] ?? null,
            'billing_period_start' => $data['billing_period_start'],
            'billing_period_end' => $data['billing_period_end'],
            'billing_date' => $data['billing_date'],
            'due_date' => $data['due_date'],
            'amount_due' => $data['amount_due'],
            'notes' => $data['notes'] ?? null,
        ]);

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
        if ($serviceCharge->payments()->exists()) {
            throw ValidationException::withMessages([
                'service_charge' => ['A service charge with payment history cannot be deleted.'],
            ]);
        }

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
                    ->whereNull('deleted_at'),
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
            'billing_period_start' => ['required', 'date'],
            'billing_period_end' => ['required', 'date', 'after_or_equal:billing_period_start'],
            'billing_date' => ['required', 'date', 'after_or_equal:billing_period_start', 'before_or_equal:billing_period_end'],
            'due_date' => ['required', 'date', 'after_or_equal:billing_date'],
            'amount_due' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'notes' => ['nullable', 'string'],
        ]);

        $rental = RentalAgreement::query()->findOrFail($data['rental_agreement_id']);
        $periodStart = $data['billing_period_start'];
        $periodEnd = $data['billing_period_end'];

        if ($periodStart < $rental->lease_start_date->toDateString()
            || $periodEnd > $rental->lease_end_date->toDateString()) {
            throw ValidationException::withMessages([
                'billing_period_start' => ['The billing period must fall within the rental lease dates.'],
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
            'partial' => $query
                ->whereRaw($confirmedSum.' > 0', [ServiceChargePaymentStatus::Confirmed->value])
                ->whereRaw($confirmedSum.' < service_charges.amount_due', [ServiceChargePaymentStatus::Confirmed->value])
                ->whereDate('due_date', '>=', now()->toDateString()),
            'overdue' => $query
                ->whereDate('due_date', '<', now()->toDateString())
                ->whereRaw($confirmedSum.' < service_charges.amount_due', [ServiceChargePaymentStatus::Confirmed->value]),
            default => $query
                ->whereDate('due_date', '>=', now()->toDateString())
                ->whereRaw($confirmedSum.' < service_charges.amount_due', [ServiceChargePaymentStatus::Confirmed->value])
                ->whereRaw($confirmedSum.' = 0', [ServiceChargePaymentStatus::Confirmed->value]),
        };
    }
}
