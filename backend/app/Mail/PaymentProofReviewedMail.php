<?php

namespace App\Mail;

use App\Models\PaymentProofSubmission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentProofReviewedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public readonly PaymentProofSubmission $submission) {}

    public function envelope(): Envelope
    {
        $status = $this->submission->status?->value ?? 'updated';

        return new Envelope(subject: 'Payment proof '.ucfirst($status));
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-proof-reviewed',
            text: 'emails.plain.payment-proof-reviewed',
            with: [
                'submission' => $this->submission,
                'status' => $this->submission->status?->value,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
