<?php

namespace App\Jobs;

use App\Enums\AllocationStatus;
use App\Mail\PaymentDueReminderMail;
use App\Models\Allocation;
use App\Models\PaymentReminder;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendPaymentReminderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public readonly int $allocationId,
        public readonly string $reminderType,
        public readonly int $daysUntilDue,
    ) {
        $this->onConnection('database');
        $this->onQueue('reminders');
    }

    public function handle(): void
    {
        $allocation = Allocation::find($this->allocationId);

        if (! $allocation || ! $allocation->client) {
            return;
        }

        if ($this->shouldSkip($allocation)) {
            return;
        }

        $client = $allocation->client;

        if (empty($client->email)) {
            return;
        }

        $mailable = PaymentDueReminderMail::fromAllocation($allocation, $this->reminderType, $this->daysUntilDue);

        Mail::to($client->email)->send($mailable);

        $this->markAsSent();
    }

    public function failed(Throwable $exception): void
    {
        PaymentReminder::where('allocation_id', $this->allocationId)
            ->where('reminder_type', $this->reminderType)
            ->update(['sent_at' => null]);
    }

    private function shouldSkip(Allocation $allocation): bool
    {
        if ($allocation->payment_duration === 'one_time') {
            return true;
        }

        if (in_array((string) $allocation->status, [
            AllocationStatus::Completed->value,
            AllocationStatus::Cancelled->value,
        ], true)) {
            return true;
        }

        if ((float) $allocation->balance <= 0) {
            return true;
        }

        return false;
    }

    private function buildSubject(?string $companyName): string
    {
        $brand = $companyName ?: 'TerraOps';

        return match ($this->daysUntilDue) {
            21 => "Payment Due In 21 Days - {$brand}",
            7 => "Payment Due In 7 Days - {$brand}",
            3 => "Payment Due In 3 Days - {$brand}",
            0 => "Payment Due Today - {$brand}",
            default => "Payment Reminder - {$brand}",
        };
    }

    private function markAsSent(): void
    {
        PaymentReminder::updateOrCreate(
            [
                'allocation_id' => $this->allocationId,
                'reminder_type' => $this->reminderType,
            ],
            ['sent_at' => now()]
        );
    }
}
