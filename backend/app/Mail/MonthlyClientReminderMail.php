<?php

namespace App\Mail;

use App\Models\Client;
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
    ) {
    }

    public function envelope(): Envelope
    {
        $subject = $this->outstandingBalance !== null && $this->outstandingBalance > 0
            ? "Monthly Update & Payment Reminder - {$this->month}"
            : "Monthly Update - {$this->month}";

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.monthly-reminder',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
