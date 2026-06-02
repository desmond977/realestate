<?php

namespace App\Mail;

use App\Models\CompanySetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminMonthlySummaryMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $summary,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'TerraOps Monthly Admin Summary - ' . ($this->summary['month'] ?? now()->format('F Y')));
    }

    public function content(): Content
    {
        $settings = CompanySetting::query()->first();

        return new Content(
            view: 'emails.admin-monthly-summary',
            text: 'emails.plain.admin-monthly-summary',
            with: [
                'summary' => $this->summary,
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
