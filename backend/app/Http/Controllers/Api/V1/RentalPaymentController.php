<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\RentalPaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\RentalPaymentPeriodResource;
use App\Models\RentalAgreement;
use App\Models\RentalPaymentPeriod;
use App\Services\RealEstate\RentalPaymentScheduleService;
use App\Services\RealEstate\RentalPaymentService;
use App\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class RentalPaymentController extends Controller
{
    public function __construct(
        private readonly RentalPaymentScheduleService $scheduleService,
        private readonly RentalPaymentService $paymentService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'rental_id' => ['sometimes', 'integer', 'exists:rental_agreements,id'],
            'status' => ['sometimes', Rule::in(['due', 'partial', 'paid', 'overdue'])],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        RentalAgreement::query()
            ->where('status', '!=', 'terminated')
            ->whereDoesntHave('paymentPeriods')
            ->orderBy('id')
            ->chunkById(100, function ($agreements): void {
                foreach ($agreements as $agreement) {
                    $this->scheduleService->ensurePeriods($agreement);
                }
            });

        $periods = RentalPaymentPeriod::query()
            ->with(['rentalAgreement.rentalProperty.property', 'rentalAgreement.client'])
            ->withSum([
                'payments as amount_paid' => fn ($query) => $query->where(
                    'status',
                    RentalPaymentStatus::Confirmed->value
                ),
            ], 'amount')
            ->when(
                $validated['rental_id'] ?? null,
                fn ($query, int $rentalId) => $query->where('rental_agreement_id', $rentalId)
            )
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->whereHas('rentalAgreement', function ($query) use ($search) {
                    $query->whereHas('client', function ($query) use ($search) {
                        $query->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    })->orWhereHas('rentalProperty', function ($query) use ($search) {
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
            ->orderByDesc('due_date')
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return RentalPaymentPeriodResource::collection($periods);
    }

    public function show(RentalPaymentPeriod $period): JsonResponse
    {
        $period->load([
            'rentalAgreement.rentalProperty.property',
            'rentalAgreement.client',
            'payments' => fn ($query) => $query->with(['recorder', 'receipt'])->latest('paid_at'),
        ]);

        $period->setAttribute('amount_paid', $period->payments
            ->where('status', RentalPaymentStatus::Confirmed)
            ->sum('amount'));

        return response()->json([
            'data' => [
                'period' => new RentalPaymentPeriodResource($period),
            ],
        ]);
    }

    public function store(Request $request, RentalPaymentPeriod $period): JsonResponse
    {
        $tenantId = app(TenantManager::class)->currentId();
        $referenceRule = Rule::unique('rental_payments', 'transaction_reference')
            ->where(fn ($query) => $tenantId === null
                ? $query
                : $query->where('tenant_id', $tenantId));

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'payment_method' => ['required', 'string', 'max:100'],
            'transaction_reference' => ['nullable', 'string', 'max:255', $referenceRule],
            'notes' => ['nullable', 'string'],
        ]);

        $payment = $this->paymentService->recordForPeriod($period, $validated, $request->user());
        $period->refresh()
            ->load(['rentalAgreement.rentalProperty.property', 'rentalAgreement.client'])
            ->setAttribute('amount_paid', $period->confirmedAmountPaid());

        return response()->json([
            'message' => 'Rental payment recorded successfully.',
            'data' => [
                'payment' => new \App\Http\Resources\RentalPaymentResource($payment),
                'period' => new RentalPaymentPeriodResource($period),
            ],
        ], 201);
    }

    private function filterByStatus($query, string $status)
    {
        $confirmedSum = '(SELECT COALESCE(SUM(rental_payments.amount), 0) FROM rental_payments'
            .' WHERE rental_payments.rental_payment_period_id = rental_payment_periods.id'
            .' AND rental_payments.status = ?)';

        return match ($status) {
            'paid' => $query->whereRaw($confirmedSum.' >= rental_payment_periods.amount_due', [
                RentalPaymentStatus::Confirmed->value,
            ]),
            'partial' => $query
                ->whereRaw($confirmedSum.' > 0', [RentalPaymentStatus::Confirmed->value])
                ->whereRaw($confirmedSum.' < rental_payment_periods.amount_due', [
                    RentalPaymentStatus::Confirmed->value,
                ]),
            'overdue' => $query
                ->whereDate('due_date', '<', now()->toDateString())
                ->whereRaw($confirmedSum.' < rental_payment_periods.amount_due', [
                    RentalPaymentStatus::Confirmed->value,
                ]),
            default => $query
                ->whereDate('due_date', '>=', now()->toDateString())
                ->whereRaw($confirmedSum.' < rental_payment_periods.amount_due', [
                    RentalPaymentStatus::Confirmed->value,
                ]),
        };
    }
}
