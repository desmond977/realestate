<?php

namespace App\Mail;

use App\Models\Allocation;
use App\Models\CompanySetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AllocationUpdatedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Allocation $allocation,
        public readonly string $previousStatus,
        public readonly float $previousAmountPaid,
        public readonly string $recipientType,
    ) {
    }

    public function envelope(): Envelope
    {
        $subject = $this->recipientType === 'admin'
            ? 'Allocation Updated - ' . ($this->allocation->client->full_name ?? 'Client')
            : 'Allocation Update Notification';

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        $settings = CompanySetting::query()->first();

        return new Content(
            view: 'emails.allocation-updated',
            text: 'emails.plain.allocation-updated',
            with: [
                'allocation' => $this->allocation,
                'previousStatus' => $this->previousStatus,
                'previousAmountPaid' => $this->previousAmountPaid,
                'recipientType' => $this->recipientType,
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
