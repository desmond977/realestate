<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Models\Allocation;
use App\Models\PaymentReminder;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class PaymentReminderService
{
    const REMINDER_TYPES = [
        '21_days' => 21,
        '7_days' => 7,
        '3_days' => 3,
        'due_date' => 0,
    ];

    public function getDueReminders(): Collection
    {
        $today = Carbon::now()->startOfDay();

        $allocations = Allocation::query()
            ->whereIn('status', [
                AllocationStatus::Active->value,
                AllocationStatus::Reserved->value,
            ])
            ->where('payment_duration', '!=', 'one_time')
            ->where('balance', '>', 0)
            ->whereNotNull('allocated_at')
            ->get();

        $due = collect();

        foreach ($allocations as $allocation) {
            $dueDate = $this->calculateDueDate($allocation);

            if (! $dueDate) {
                continue;
            }

            $diffInDays = $today->diffInDays($dueDate, false);

            if ($diffInDays < 0) {
                continue;
            }

            $reminderType = $this->diffToReminderType($diffInDays);

            if (! $reminderType) {
                continue;
            }

            $due->push([
                'allocation' => $allocation,
                'reminder_type' => $reminderType,
                'due_date' => $dueDate,
                'days_until_due' => (int) $diffInDays,
            ]);
        }

        return $due;
    }

    public function isReminderSent(int $allocationId, string $reminderType): bool
    {
        return PaymentReminder::where('allocation_id', $allocationId)
            ->where('reminder_type', $reminderType)
            ->whereNotNull('sent_at')
            ->exists();
    }

    public function markReminderSent(int $allocationId, string $reminderType): void
    {
        PaymentReminder::create([
            'allocation_id' => $allocationId,
            'reminder_type' => $reminderType,
            'sent_at' => now(),
        ]);
    }

    private function calculateDueDate(Allocation $allocation): ?Carbon
    {
        if (! $allocation->allocated_at) {
            return null;
        }

        $interval = $allocation->paymentDurationInterval();

        if ((int) $interval['value'] <= 0) {
            return null;
        }

        $dueDate = Carbon::parse($allocation->allocated_at);

        return match ($interval['unit']) {
            'days' => $dueDate->addDays((int) $interval['value']),
            'weeks' => $dueDate->addWeeks((int) $interval['value']),
            'months' => $dueDate->addMonths((int) $interval['value']),
            'years' => $dueDate->addYears((int) $interval['value']),
            default => null,
        };
    }

    private function diffToReminderType(int $diffInDays): ?string
    {
        return match ($diffInDays) {
            21, 7, 3, 0 => array_search($diffInDays, self::REMINDER_TYPES, true),
            default => null,
        };
    }
}
