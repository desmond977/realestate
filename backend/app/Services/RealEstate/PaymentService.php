<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use App\Models\Allocation;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function __construct(
        private readonly ReceiptService $receiptService,
        private readonly PropertyInventoryService $propertyInventoryService,
        private readonly EmailNotificationService $emailNotificationService,
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function recordForAllocation(Allocation $allocation, array $payload, ?User $recorder = null): Payment
    {
        return DB::transaction(function () use ($allocation, $payload, $recorder) {
            $allocation = Allocation::query()
                ->with(['property', 'realtor'])
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            if ($allocation->status === AllocationStatus::Cancelled) {
                throw ValidationException::withMessages([
                    'allocation_id' => ['Payments cannot be recorded for a cancelled allocation.'],
                ]);
            }

            if ($allocation->status === AllocationStatus::Completed) {
                throw ValidationException::withMessages([
                    'allocation_id' => ['This allocation has already been fully paid.'],
                ]);
            }

            $amount = round((float) $payload['amount'], 2);
            $balance = round((float) $allocation->balance, 2);

            if ($amount > $balance) {
                throw ValidationException::withMessages([
                    'amount' => ['Payment amount cannot exceed the outstanding balance.'],
                ]);
            }

            $payment = Payment::query()->create([
                'allocation_id' => $allocation->id,
                'property_id' => $allocation->property_id,
                'client_id' => $allocation->client_id,
                'realtor_id' => $allocation->realtor_id,
                'recorded_by' => $recorder?->id,
                'amount' => $amount,
                'payment_type' => $payload['payment_type'] ?? $allocation->payment_plan->value,
                'payment_method' => $payload['payment_method'] ?? null,
                'status' => $payload['status'] ?? PaymentStatus::Confirmed->value,
                'transaction_reference' => $payload['transaction_reference'] ?? null,
                'paid_at' => $payload['paid_at'] ?? now(),
                'notes' => $payload['notes'] ?? null,
            ]);

            if ($payment->status === PaymentStatus::Confirmed) {
                $newAmountPaid = round((float) $allocation->amount_paid + $amount, 2);
                $newBalance = max(round((float) $allocation->total_amount - $newAmountPaid, 2), 0);

                $allocation->forceFill([
                    'amount_paid' => $newAmountPaid,
                    'balance' => $newBalance,
                    'status' => $newBalance <= 0 ? AllocationStatus::Completed : AllocationStatus::Active,
                ])->save();

                if ($newBalance <= 0) {
                    $this->propertyInventoryService->sellReserved($allocation->property);
                }

                $this->receiptService->createForPayment($payment, $recorder);
            }

            return $payment->load(['allocation.realtor', 'client.realtor', 'realtor', 'property', 'receipt']);
        });
    }

    /**
     * Send notification for payment received (called after transaction completes)
     */
    public function notifyPaymentReceived(Payment $payment): void
    {
        $this->emailNotificationService->sendPaymentReceived($payment);
    }
}
