<?php

namespace App\Services\RealEstate;

use App\Enums\UserRole;
use App\Mail\AllocationCreatedMail;
use App\Mail\AllocationUpdatedMail;
use App\Mail\AdminMonthlySummaryMail;
use App\Mail\MonthlyClientReminderMail;
use App\Mail\OutstandingBalanceReminderMail;
use App\Mail\PaymentReceivedMail;
use App\Mail\PaymentUpdatedMail;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\CompanySetting;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class EmailNotificationService
{
    public function __construct()
    {
    }

    public function sendAllocationCreated(Allocation $allocation): void
    {
        if ($allocation->client->email) {
            $this->queueMail($allocation->client->email, new AllocationCreatedMail($allocation, 'client'));
        }

        $adminEmails = User::where('role', UserRole::Admin)->pluck('email')->filter()->unique();
        foreach ($adminEmails as $email) {
            $this->queueMail($email, new AllocationCreatedMail($allocation, 'admin'));
        }
    }

    public function sendAllocationUpdated(Allocation $allocation, string $previousStatus, float $previousAmountPaid): void
    {
        if ($allocation->client->email) {
            $this->queueMail($allocation->client->email, new AllocationUpdatedMail($allocation, $previousStatus, $previousAmountPaid, 'client'));
        }

        $adminEmails = User::where('role', UserRole::Admin)->pluck('email')->filter()->unique();
        foreach ($adminEmails as $email) {
            $this->queueMail($email, new AllocationUpdatedMail($allocation, $previousStatus, $previousAmountPaid, 'admin'));
        }
    }

    public function sendPaymentReceived(Payment $payment): void
    {
        if ($payment->client->email) {
            $this->queueMail($payment->client->email, new PaymentReceivedMail($payment, 'client'));
        }

        $adminEmails = User::where('role', UserRole::Admin)->pluck('email')->filter()->unique();
        foreach ($adminEmails as $email) {
            $this->queueMail($email, new PaymentReceivedMail($payment, 'admin'));
        }
    }

    public function sendPaymentUpdated(Payment $payment, float $oldAmount): void
    {
        if ($payment->client->email) {
            $this->queueMail($payment->client->email, new PaymentUpdatedMail($payment, $oldAmount, 'client'));
        }

        $adminEmails = User::where('role', UserRole::Admin)->pluck('email')->filter()->unique();
        foreach ($adminEmails as $email) {
            $this->queueMail($email, new PaymentUpdatedMail($payment, $oldAmount, 'admin'));
        }
    }

    public function sendOutstandingReminder(Allocation $allocation): void
    {
        if ($allocation->client->email && $allocation->balance > 0) {
            $this->queueMail($allocation->client->email, new OutstandingBalanceReminderMail($allocation));
        }
    }

    public function sendMonthlyReminder(Client $client, ?float $outstandingBalance = null, array $outstandingAllocations = []): void
    {
        if (!$client->email) {
            return;
        }

        $month = now()->format('F Y');

        $this->queueMail($client->email, new MonthlyClientReminderMail($client, $month, $outstandingBalance, $outstandingAllocations));
    }

    public function sendAdminMonthlySummary(array $summary): void
    {
        $adminEmails = User::where('role', UserRole::Admin)->pluck('email')->filter()->unique();

        foreach ($adminEmails as $email) {
            $this->queueMail($email, new AdminMonthlySummaryMail($summary));
        }
    }

    public function getCompanySettings(): array
    {
        $settings = CompanySetting::first();

        return [
            'company_name' => $settings?->company_name ?? config('app.name'),
            'company_email' => $settings?->company_email ?? config('mail.from.address'),
            'company_phone' => $settings?->company_phone,
            'company_address' => $settings?->company_address,
            'company_logo' => $settings?->company_logo,
        ];
    }

    private function queueMail(string $email, Mailable $mail): void
    {
        if (config('queue.default') === 'sync') {
            Log::warning('Email notification skipped because QUEUE_CONNECTION=sync would send mail during the web request.', [
                'email' => $email,
                'mail' => $mail::class,
            ]);

            return;
        }

        try {
            Mail::to($email)->queue($mail);
        } catch (Throwable $exception) {
            Log::warning('Email notification could not be queued.', [
                'email' => $email,
                'mail' => $mail::class,
                'error' => $exception->getMessage(),
            ]);
        }
    }
}
