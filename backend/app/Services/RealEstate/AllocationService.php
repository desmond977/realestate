<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Models\Allocation;
use App\Models\Client;
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
            $client = Client::query()->lockForUpdate()->findOrFail($payload['client_id']);

            if ($property->available_count < 1) {
                throw ValidationException::withMessages([
                    'property_id' => ['No available plots remain for this property.'],
                ]);
            }

            $totalAmount = round((float) $payload['total_amount'], 2);
            $initialPaymentAmount = round((float) ($payload['initial_payment_amount'] ?? 0), 2);
            $paymentPlan = $payload['payment_plan'];
            $paymentStatus = $payload['payment_status'] ?? match (true) {
                $initialPaymentAmount >= $totalAmount => 'paid',
                $initialPaymentAmount > 0 => 'part_payment',
                default => 'unpaid',
            };

            if ($paymentStatus === 'paid') {
                $paymentPlan = PaymentPlan::Full->value;
                $initialPaymentAmount = $totalAmount;
            }

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

            if ($paymentStatus === 'part_payment' && $initialPaymentAmount <= 0) {
                throw ValidationException::withMessages([
                    'initial_payment_amount' => ['Part payment allocations must include an amount paid.'],
                ]);
            }

            if ($paymentStatus === 'unpaid') {
                $initialPaymentAmount = 0;
            }

            $realtorId = $payload['realtor_id'] ?? $client->realtor_id;

            if ($realtorId && (int) $client->realtor_id !== (int) $realtorId) {
                $client->forceFill(['realtor_id' => $realtorId])->save();
            }

            $allocation = Allocation::query()->create([
                'property_id' => $property->id,
                'client_id' => $client->id,
                'realtor_id' => $realtorId,
                'allocated_by' => $allocator?->id,
                'total_amount' => $totalAmount,
                'amount_paid' => 0,
                'balance' => $totalAmount,
                'payment_plan' => $paymentPlan,
                'status' => AllocationStatus::Active->value,
                'allocated_at' => $payload['allocated_at'] ?? now()->toDateString(),
                'notes' => $payload['notes'] ?? null,
            ]);

            $property->forceFill([
                'available_count' => max($property->available_count - 1, 0),
                'reserved_count' => $property->reserved_count + 1,
            ])->save();

            if ($initialPaymentAmount > 0) {
                $this->paymentService->recordForAllocation($allocation, [
                    'amount' => $initialPaymentAmount,
                    'payment_type' => $paymentPlan,
                    'payment_method' => $payload['payment_method'] ?? null,
                    'transaction_reference' => $payload['transaction_reference'] ?? null,
                    'paid_at' => $payload['paid_at'] ?? now(),
                    'notes' => $payload['payment_notes'] ?? null,
                    'generate_receipt' => (bool) ($payload['generate_receipt'] ?? true),
                    'receipt_notes' => $payload['receipt_notes'] ?? null,
                    'receipt_reference' => $payload['receipt_reference'] ?? null,
                ], $allocator);
            }

            return $allocation->fresh(['client.realtor', 'realtor', 'property', 'payments.receipt']);
        });
    }

    public function cancel(Allocation $allocation): Allocation
    {
        return DB::transaction(function () use ($allocation) {
            $allocation = Allocation::query()
                ->with(['property'])
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            if ($allocation->amount_paid > 0) {
                throw ValidationException::withMessages([
                    'allocation_id' => ['Allocations with recorded payments cannot be cancelled.'],
                ]);
            }

            $allocation->forceFill(['status' => AllocationStatus::Cancelled])->save();
            $allocation->property->forceFill([
                'available_count' => $allocation->property->available_count + 1,
                'reserved_count' => max($allocation->property->reserved_count - 1, 0),
            ])->save();

            return $allocation->fresh(['client.realtor', 'realtor', 'property']);
        });
    }
}
