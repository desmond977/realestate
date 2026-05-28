<?php

namespace App\Services\RealEstate;

use App\Enums\UserRole;
use App\Mail\AllocationCreatedMail;
use App\Mail\MonthlyClientReminderMail;
use App\Mail\OutstandingBalanceReminderMail;
use App\Mail\PaymentReceivedMail;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\CompanySetting;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class EmailNotificationService
{
    public function __construct()
    {
    }

    public function sendAllocationCreated(Allocation $allocation): void
    {
        // Send to client
        if ($allocation->client->email) {
            Mail::to($allocation->client->email)
                ->send(new AllocationCreatedMail($allocation, 'client'));
        }

        // Send to all admins
        $admins = User::where('role', UserRole::Admin)->get();
        foreach ($admins as $admin) {
            if ($admin->email) {
                Mail::to($admin->email)
                    ->send(new AllocationCreatedMail($allocation, 'admin'));
            }
        }
    }

    public function sendPaymentReceived(Payment $payment): void
    {
        // Send to client
        if ($payment->client->email) {
            Mail::to($payment->client->email)
                ->send(new PaymentReceivedMail($payment, 'client'));
        }

        // Send to all admins
        $admins = User::where('role', UserRole::Admin)->get();
        foreach ($admins as $admin) {
            if ($admin->email) {
                Mail::to($admin->email)
                    ->send(new PaymentReceivedMail($payment, 'admin'));
            }
        }
    }

    public function sendOutstandingReminder(Allocation $allocation): void
    {
        if ($allocation->client->email && $allocation->balance > 0) {
            Mail::to($allocation->client->email)
                ->send(new OutstandingBalanceReminderMail($allocation));
        }
    }

    public function sendMonthlyReminder(Client $client, ?float $outstandingBalance = null): void
    {
        if (!$client->email) {
            return;
        }

        $month = now()->format('F Y');

        Mail::to($client->email)
            ->send(new MonthlyClientReminderMail($client, $month, $outstandingBalance));
    }

    public function sendMonthlyRemindersToAllClients(): void
    {
        // Get all clients with active or reserved allocations
        $clients = Client::whereHas('allocations', function ($query) {
            $query->whereIn('status', ['active', 'reserved']);
        })->get();

        foreach ($clients as $client) {
            // Get the total outstanding balance for this client
            $totalOutstanding = Allocation::where('client_id', $client->id)
                ->whereIn('status', ['active', 'reserved'])
                ->sum('balance');

            $this->sendMonthlyReminder($client, $totalOutstanding > 0 ? $totalOutstanding : null);
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
}
