<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use Carbon\Carbon;

class MonthlyReminderService
{
    public function __construct(private readonly EmailNotificationService $emailNotificationService)
    {
    }

    public function sendMonthlyClientReminders(): void
    {
        $clients = Client::query()
            ->whereHas('allocations', function ($query) {
                $query->whereIn('status', [AllocationStatus::Active->value, AllocationStatus::Reserved->value]);
            })
            ->with(['allocations.property'])
            ->get();

        foreach ($clients as $client) {
            $outstandingAllocations = $client->allocations
                ->filter(fn ($allocation) => $allocation->balance > 0)
                ->values();

            $totalOutstanding = $outstandingAllocations->sum('balance');

            $this->emailNotificationService->sendMonthlyReminder(
                $client,
                $totalOutstanding > 0 ? $totalOutstanding : null,
                $outstandingAllocations->toArray(),
            );
        }

        $this->sendAdminMonthlySummary();
    }

    public function sendAdminMonthlySummary(): void
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $summary = [
            'month' => Carbon::now()->format('F Y'),
            'total_clients' => Client::count(),
            'total_properties_sold' => Property::where('status', PropertyStatus::Sold)->count(),
            'total_outstanding_balances' => Allocation::whereIn('status', [AllocationStatus::Active->value, AllocationStatus::Reserved->value])->sum('balance'),
            'total_payments_received' => Payment::where('status', PaymentStatus::Confirmed->value)
                ->whereBetween('paid_at', [$startOfMonth, $endOfMonth])
                ->sum('amount'),
            'new_allocations_this_month' => Allocation::whereBetween('created_at', [$startOfMonth, $endOfMonth])->count(),
        ];

        $this->emailNotificationService->sendAdminMonthlySummary($summary);
    }
}
