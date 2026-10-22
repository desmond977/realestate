<?php

namespace App\Mail;

use App\Models\Allocation;
use App\Models\CompanySetting;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class PaymentDueReminderMail extends Mailable
{
    use Queueable;

    public function __construct(
        public readonly Allocation $allocation,
        public readonly string $reminderType,
        public readonly int $daysUntilDue,
        public readonly Carbon $dueDate,
    ) {}

    public static function fromAllocation(Allocation $allocation, string $reminderType, int $daysUntilDue): self
    {
        $interval = $allocation->paymentDurationInterval();
        $dueDate = Carbon::parse($allocation->allocated_at);

        match ($interval['unit']) {
            'days' => $dueDate->addDays((int) $interval['value']),
            'weeks' => $dueDate->addWeeks((int) $interval['value']),
            'months' => $dueDate->addMonths((int) $interval['value']),
            'years' => $dueDate->addYears((int) $interval['value']),
            default => $dueDate,
        };

        return new self($allocation, $reminderType, $daysUntilDue, $dueDate);
    }

    public function envelope(): Envelope
    {
        $settings = CompanySetting::query()->first();
        $subject = match ($this->daysUntilDue) {
            21 => 'Payment Due In 21 Days - '.($settings?->company_name ?? 'TerraOps'),
            7 => 'Payment Due In 7 Days - '.($settings?->company_name ?? 'TerraOps'),
            3 => 'Payment Due In 3 Days - '.($settings?->company_name ?? 'TerraOps'),
            0 => 'Payment Due Today - '.($settings?->company_name ?? 'TerraOps'),
            default => 'Payment Reminder - '.($settings?->company_name ?? 'TerraOps'),
        };

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $settings = CompanySetting::query()->first();

        return new Content(
            view: 'emails.payment-due-reminder',
            text: 'emails.plain.payment-due-reminder',
            with: [
                'allocation' => $this->allocation,
                'reminderType' => $this->reminderType,
                'daysUntilDue' => $this->daysUntilDue,
                'dueDate' => $this->dueDate,
                'companyName' => $settings?->company_name ?? 'TerraOps',
                'companyEmail' => $settings?->company_email,
                'companyPhone' => $settings?->company_phone,
                'companyAddress' => $settings?->company_address,
                'companyLogo' => $settings?->company_logo,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
