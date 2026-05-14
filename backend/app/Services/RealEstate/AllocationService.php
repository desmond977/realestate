<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Property;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AllocationService
{
    public function __construct(private readonly PaymentService $paymentService)
    {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function create(array $payload, ?User $allocator = null): Allocation
    {
        return DB::transaction(function () use ($payload, $allocator) {
            $property = Property::query()->lockForUpdate()->findOrFail($payload['property_id']);

            if ($property->status !== PropertyStatus::Available) {
                throw ValidationException::withMessages([
                    'property_id' => ['Only available properties can be allocated.'],
                ]);
            }

            $totalAmount = round((float) $payload['total_amount'], 2);
            $initialPaymentAmount = round((float) ($payload['initial_payment_amount'] ?? 0), 2);
            $paymentPlan = $payload['payment_plan'];

            if ($initialPaymentAmount > $totalAmount) {
                throw ValidationException::withMessages([
                    'initial_payment_amount' => ['Initial payment cannot exceed the total allocation amount.'],
                ]);
            }

            if ($paymentPlan === PaymentPlan::Full->value && $initialPaymentAmount !== $totalAmount) {
                throw ValidationException::withMessages([
                    'initial_payment_amount' => ['Full payment allocations must include the full allocation amount.'],
                ]);
            }

            $allocation = Allocation::query()->create([
                'property_id' => $property->id,
                'client_id' => $payload['client_id'],
                'allocated_by' => $allocator?->id,
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'balance' => $totalAmount,
                'payment_plan' => $paymentPlan,
                'status' => AllocationStatus::Active->value,
                'allocated_at' => $payload['allocated_at'] ?? now()->toDateString(),
                'notes' => $payload['notes'] ?? null,
            ]);

            $property->forceFill(['status' => PropertyStatus::Reserved])->save();

            if ($initialPaymentAmount > 0) {
                $this->paymentService->recordForAllocation($allocation, [
                    'amount' => $initialPaymentAmount,
                    'payment_type' => $paymentPlan,
                    'payment_method' => $payload['payment_method'] ?? null,
                    'transaction_reference' => $payload['transaction_reference'] ?? null,
                    'paid_at' => $payload['paid_at'] ?? now(),
                    'notes' => $payload['payment_notes'] ?? null,
                ], $allocator);
            }

            return $allocation->fresh(['client', 'property', 'payments.receipt']);
        });
    }

    public function cancel(Allocation $allocation): Allocation
    {
        return DB::transaction(function () use ($allocation) {
            $allocation = Allocation::query()
                ->with('property')
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            if ($allocation->amount_paid > 0) {
                throw ValidationException::withMessages([
                    'allocation_id' => ['Allocations with recorded payments cannot be cancelled.'],
                ]);
            }

            $allocation->forceFill(['status' => AllocationStatus::Cancelled])->save();
            $allocation->property->forceFill(['status' => PropertyStatus::Available])->save();

            return $allocation->fresh(['client', 'property']);
        });
    }
}
