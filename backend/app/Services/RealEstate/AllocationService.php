<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PropertyStatus;
use App\Enums\UserRole;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AllocationService
{
    public function __construct(
        private readonly PaymentService $paymentService,
        private readonly PropertyInventoryService $propertyInventoryService,
        private readonly AllocationNotificationService $allocationNotificationService,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function create(array $payload, ?User $allocator = null): Allocation
    {
        try {
            return DB::transaction(function () use ($payload, $allocator) {
                $property = Property::query()->lockForUpdate()->findOrFail($payload['property_id']);
                $client = Client::query()->lockForUpdate()->findOrFail($payload['client_id']);

                if ($property->status === PropertyStatus::Sold) {
                    throw ValidationException::withMessages([
                        'property_id' => ['Sold properties cannot be allocated.'],
                    ]);
                }

                if ($property->available_count < 1) {
                    throw ValidationException::withMessages([
                        'property_id' => ['No available plots remain for this property.'],
                    ]);
                }

                $existingAllocation = Allocation::query()
                    ->where('property_id', $property->id)
                    ->where('client_id', $client->id)
                    ->whereIn('status', [
                        AllocationStatus::Reserved->value,
                        AllocationStatus::Active->value,
                        AllocationStatus::Completed->value,
                    ])
                    ->lockForUpdate()
                    ->first();

                if ($existingAllocation) {
                    throw ValidationException::withMessages([
                        'client_id' => ['This client already has an allocation for the selected property.'],
                        'property_id' => ['This property is already allocated to the selected client.'],
                    ]);
                }

                $originalPriceCents = $this->toCents($property->price);
                $submittedTotalAmount = array_key_exists('total_amount', $payload)
                    ? $this->toCents($payload['total_amount'])
                    : null;

                if ($submittedTotalAmount !== null && $submittedTotalAmount !== $originalPriceCents) {
                    throw ValidationException::withMessages([
                        'total_amount' => ['Allocation amount must match the selected property price.'],
                    ]);
                }

                $pricing = $this->calculatePricing(
                    $originalPriceCents,
                    $payload['discount_type'] ?? null,
                    $payload['discount_value'] ?? 0
                );
                $totalAmount = $pricing['final_payable_amount'];
                $initialPaymentAmountCents = $this->toCents($payload['initial_payment_amount'] ?? 0);
                $paymentPlan = $payload['payment_plan'];
                $paymentStatus = $payload['payment_status'] ?? match (true) {
                    $initialPaymentAmountCents >= $pricing['final_payable_cents'] => 'paid',
                    $initialPaymentAmountCents > 0 => 'part_payment',
                    default => 'unpaid',
                };

                if ($paymentStatus === 'paid') {
                    $paymentPlan = PaymentPlan::Full->value;
                    $initialPaymentAmountCents = $pricing['final_payable_cents'];
                }

                if ($paymentStatus === 'unpaid') {
                    $initialPaymentAmountCents = 0;
                }

                if ($paymentStatus === 'part_payment' && $initialPaymentAmountCents <= 0) {
                    throw ValidationException::withMessages([
                        'initial_payment_amount' => ['Part payment allocations must include an amount paid.'],
                    ]);
                }

                if ($initialPaymentAmountCents > $pricing['final_payable_cents']) {
                    throw ValidationException::withMessages([
                        'initial_payment_amount' => ['Initial payment cannot exceed the total allocation amount.'],
                    ]);
                }

                if ($paymentStatus !== 'unpaid'
                    && $paymentPlan === PaymentPlan::Full->value
                    && $initialPaymentAmountCents !== $pricing['final_payable_cents']) {
                    throw ValidationException::withMessages([
                        'initial_payment_amount' => ['Full payment allocations must include the full allocation amount.'],
                    ]);
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
                    'original_price' => $this->fromCents($originalPriceCents),
                    'discount_type' => $pricing['discount_type'],
                    'discount_value' => $pricing['discount_value'],
                    'discount_amount' => $this->fromCents($pricing['discount_amount_cents']),
                    'total_amount' => $totalAmount,
                    'amount_paid' => 0,
                    'balance' => $totalAmount,
                    'payment_plan' => $paymentPlan,
                    'payment_duration' => $payload['payment_duration'],
                    'custom_duration_value' => $payload['payment_duration'] === 'custom'
                        ? $payload['custom_duration_value']
                        : null,
                    'custom_duration_unit' => $payload['payment_duration'] === 'custom'
                        ? $payload['custom_duration_unit']
                        : null,
                    'status' => $pricing['final_payable_cents'] === 0
                        ? AllocationStatus::Completed->value
                        : ($paymentStatus === 'unpaid'
                            ? AllocationStatus::Reserved->value
                            : AllocationStatus::Active->value),
                    'allocated_at' => $payload['allocated_at'] ?? now()->toDateString(),
                    'notes' => $payload['notes'] ?? null,
                    'payment_screenshot' => $payload['payment_screenshot'] ?? null,
                ]);

                $this->propertyInventoryService->reserveOne($property);

                if ($pricing['final_payable_cents'] === 0) {
                    $this->propertyInventoryService->sellReserved($property);
                } elseif ($initialPaymentAmountCents > 0) {
                    $this->paymentService->recordForAllocation($allocation, [
                        'amount' => $this->fromCents($initialPaymentAmountCents),
                        'payment_type' => $paymentPlan,
                        'payment_method' => $payload['payment_method'] ?? null,
                        'paid_at' => $payload['paid_at'] ?? now(),
                    ], $allocator);
                }

                return $allocation->fresh(['client.realtor', 'realtor', 'property', 'payments.receipt']);
            });
        } catch (QueryException $exception) {
            if (str_contains($exception->getMessage(), 'allocations_active_duplicate_key_unique')) {
                throw ValidationException::withMessages([
                    'client_id' => ['This client already has an allocation for the selected property.'],
                    'property_id' => ['This property is already allocated to the selected client.'],
                ]);
            }

            throw $exception;
        }
    }

    /**
     * Send notification for allocation creation (called after transaction completes)
     */
    public function notifyAllocationCreated(Allocation $allocation): void
    {
        $this->allocationNotificationService->sendAllocationCreated($allocation);
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
            $this->propertyInventoryService->releaseReservation($allocation->property);

            return $allocation->fresh(['client.realtor', 'realtor', 'property']);
        });
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function updatePaymentState(Allocation $allocation, array $payload, ?User $user = null): Allocation
    {
        return DB::transaction(function () use ($allocation, $payload, $user) {
            $allocation = Allocation::query()
                ->with(['client.realtor', 'realtor', 'property', 'payments.receipt'])
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            if ($allocation->status === AllocationStatus::Cancelled) {
                throw ValidationException::withMessages([
                    'allocation_id' => ['Cancelled allocations cannot be updated.'],
                ]);
            }

            if (array_key_exists('discount_type', $payload) || array_key_exists('discount_value', $payload)) {
                $this->updateDiscount($allocation, $payload, $user);
            }

            $previousStatus = $allocation->status->value;
            $previousAmountPaid = (float) ($allocation->amount_paid ?? 0);

            $updates = [];

            if (array_key_exists('notes', $payload)) {
                $updates['notes'] = $payload['notes'];
            }

            if (array_key_exists('payment_screenshot', $payload)) {
                $updates['payment_screenshot'] = $payload['payment_screenshot'];
            }

            if (array_key_exists('payment_duration', $payload)) {
                $updates['payment_duration'] = $payload['payment_duration'];
                $updates['custom_duration_value'] = $payload['payment_duration'] === 'custom'
                    ? $payload['custom_duration_value']
                    : null;
                $updates['custom_duration_unit'] = $payload['payment_duration'] === 'custom'
                    ? $payload['custom_duration_unit']
                    : null;
            }

            if (($payload['payment_status'] ?? null) === 'unpaid' && (float) ($allocation->amount_paid ?? 0) <= 0) {
                $updates['status'] = AllocationStatus::Reserved->value;
            }

            if ($updates !== []) {
                $allocation->forceFill($updates)->save();
            }

            $paymentAmount = round((float) ($payload['initial_payment_amount'] ?? $payload['amount'] ?? 0), 2);
            $paymentStatus = $payload['payment_status'] ?? null;

            if ($paymentAmount > 0) {
                if ($paymentStatus === 'paid' && abs($paymentAmount - (float) $allocation->balance) > 0.01) {
                    throw ValidationException::withMessages([
                        'initial_payment_amount' => ['Paid allocations must include the full outstanding balance.'],
                    ]);
                }

                $this->paymentService->recordForAllocation($allocation, [
                    'amount' => $paymentAmount,
                    'payment_type' => $payload['payment_type'] ?? $allocation->payment_plan->value,
                    'payment_method' => $payload['payment_method'] ?? null,
                    'paid_at' => $payload['paid_at'] ?? now(),
                ], $user);
            } elseif (in_array($paymentStatus, ['paid', 'part_payment'], true)) {
                throw ValidationException::withMessages([
                    'initial_payment_amount' => ['A payment amount is required to update this allocation payment status.'],
                ]);
            }

            $updatedAllocation = $allocation->fresh(['client.realtor', 'realtor', 'property', 'payments.receipt', 'allocator']);
            $this->allocationNotificationService->sendAllocationUpdated($updatedAllocation, $previousStatus, $previousAmountPaid);

            return $updatedAllocation;
        });
    }

    /**
     * @return array{original_price_cents:int, discount_type:?string, discount_value:string, discount_amount_cents:int, final_payable_cents:int, final_payable_amount:float}
     */
    private function calculatePricing(int $originalPriceCents, ?string $discountType, mixed $discountValue): array
    {
        $discountType = $discountType !== '' ? $discountType : null;
        $discountValue = $discountValue === null || $discountValue === '' ? 0 : $discountValue;
        $discountValueCents = $this->toCents($discountValue);
        $discountValueNumber = (float) $discountValue;

        if ($discountValueNumber < 0) {
            throw ValidationException::withMessages([
                'discount_value' => ['Discount value cannot be negative.'],
            ]);
        }

        if ($discountType === null && $discountValueCents > 0) {
            throw ValidationException::withMessages([
                'discount_type' => ['Choose a discount type when specifying a discount value.'],
            ]);
        }

        if ($discountType === 'fixed' && $discountValueCents > $originalPriceCents) {
            throw ValidationException::withMessages([
                'discount_value' => ['Fixed discount cannot exceed the original property price.'],
            ]);
        }

        if ($discountType === 'percentage' && $discountValueNumber > 100) {
            throw ValidationException::withMessages([
                'discount_value' => ['Percentage discount cannot exceed 100%.'],
            ]);
        }

        $discountAmountCents = match ($discountType) {
            'fixed' => $discountValueCents,
            'percentage' => (int) round($originalPriceCents * ($discountValueNumber / 100), 0, PHP_ROUND_HALF_UP),
            default => 0,
        };

        if ($discountAmountCents > $originalPriceCents) {
            throw ValidationException::withMessages([
                'discount_value' => ['Discount cannot reduce the final payable amount below zero.'],
            ]);
        }

        $finalPayableCents = $originalPriceCents - $discountAmountCents;

        return [
            'original_price_cents' => $originalPriceCents,
            'discount_type' => $discountType,
            'discount_value' => number_format($discountValueNumber, 2, '.', ''),
            'discount_amount_cents' => $discountAmountCents,
            'final_payable_cents' => $finalPayableCents,
            'final_payable_amount' => $this->fromCents($finalPayableCents),
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function updateDiscount(Allocation $allocation, array $payload, ?User $user): void
    {
        if ($user?->role !== UserRole::Admin) {
            throw ValidationException::withMessages([
                'discount_type' => ['Only administrators can apply or change allocation discounts.'],
            ]);
        }

        $originalPriceCents = $this->toCents($allocation->original_price ?? $allocation->total_amount);
        $discountType = array_key_exists('discount_type', $payload)
            ? $payload['discount_type']
            : $allocation->discount_type;
        $discountValue = array_key_exists('discount_value', $payload)
            ? $payload['discount_value']
            : (array_key_exists('discount_type', $payload) && $discountType === null
                ? 0
                : ($allocation->discount_value ?? 0));
        $pricing = $this->calculatePricing($originalPriceCents, $discountType, $discountValue);
        $discountChanged = $pricing['discount_type'] !== $allocation->discount_type
            || $this->toCents($allocation->discount_value ?? 0) !== $this->toCents($pricing['discount_value'])
            || $this->toCents($allocation->discount_amount ?? 0) !== $pricing['discount_amount_cents']
            || $this->toCents($allocation->total_amount) !== $pricing['final_payable_cents'];

        if (! $discountChanged) {
            return;
        }

        if (
            $allocation->payments()->exists()
            || $this->toCents($allocation->amount_paid ?? 0) > 0
            || $allocation->status === AllocationStatus::Completed
        ) {
            throw ValidationException::withMessages([
                'discount_type' => ['Discounts cannot change after a payment has been recorded or an allocation completed.'],
            ]);
        }

        $allocation->forceFill([
            'discount_type' => $pricing['discount_type'],
            'discount_value' => $pricing['discount_value'],
            'discount_amount' => $this->fromCents($pricing['discount_amount_cents']),
            'total_amount' => $pricing['final_payable_amount'],
            'balance' => $pricing['final_payable_amount'],
            'status' => $pricing['final_payable_cents'] === 0
                ? AllocationStatus::Completed
                : $allocation->status,
        ])->save();

        if ($pricing['final_payable_cents'] === 0) {
            $this->propertyInventoryService->sellReserved($allocation->property);
        }
    }

    private function toCents(mixed $amount): int
    {
        return (int) round((float) $amount * 100, 0, PHP_ROUND_HALF_UP);
    }

    private function fromCents(int $amount): float
    {
        return round($amount / 100, 2);
    }
}
