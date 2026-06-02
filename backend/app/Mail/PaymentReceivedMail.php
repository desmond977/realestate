<?php

namespace App\Mail;

use App\Models\Payment;
use App\Models\CompanySetting;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReceivedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Payment $payment,
        public readonly string $recipientType, // 'client' or 'admin'
    ) {
    }

    public function envelope(): Envelope
    {
        $subject = $this->recipientType === 'admin'
            ? 'Payment Received - ' . ($this->payment->client->full_name ?? 'Client')
            : 'Payment Confirmation - Receipt Generated';

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $settings = CompanySetting::query()->first();

        return new Content(
            view: 'emails.payment-received',
            text: 'emails.plain.payment-received',
            with: [
                'payment' => $this->payment,
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
