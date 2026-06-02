<?php

namespace App\Mail;

use App\Models\Client;
use App\Models\CompanySetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MonthlyClientReminderMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Client $client,
        public readonly string $month,
        public readonly ?float $outstandingBalance = null,
        public readonly array $outstandingAllocations = [],
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Happy New Month from TerraOps',
        );
    }

    public function content(): Content
    {
        $settings = CompanySetting::query()->first();

        return new Content(
            view: 'emails.monthly-reminder',
            text: 'emails.plain.monthly-reminder',
            with: [
                'client' => $this->client,
                'month' => $this->month,
                'outstandingBalance' => $this->outstandingBalance,
                'outstandingAllocations' => $this->outstandingAllocations,
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
