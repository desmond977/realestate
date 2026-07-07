<?php

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Models\Client;
use Illuminate\Support\Collection;

class ClientDashboardService
{
    public function __construct(private readonly Client $client)
    {
    }

    public function getAllocations(): Collection
    {
        return $this->client->allocations()
            ->with(['property', 'realtor'])
            ->latest('allocated_at')
            ->get()
            ->each(fn ($allocation) => $allocation->syncPaymentTotals());
    }

    public function getDashboardSummary(): array
    {
        $allocations = $this->getAllocations();
        $confirmedPayments = $this->client->payments()
            ->where('status', PaymentStatus::Confirmed->value);

        $totalAllocated = (float) $allocations->sum('total_amount');
        $totalPaid = (float) $confirmedPayments->sum('amount');
        $outstanding = max(0, (float) $allocations->sum('balance'));

        return [
            'total_properties' => $allocations->count(),
            'active_allocations' => $allocations
                ->filter(fn ($allocation) => ($allocation->status?->value ?? $allocation->status) === 'active')
                ->count(),
            'completed_allocations' => $allocations
                ->filter(fn ($allocation) => ($allocation->status?->value ?? $allocation->status) === 'completed')
                ->count(),
            'total_allocated' => $totalAllocated,
            'total_paid' => $totalPaid,
            'outstanding_balance' => $outstanding,
            'payment_progress' => $totalAllocated > 0
                ? round(min(100, ($totalPaid / $totalAllocated) * 100), 2)
                : 0,
            'receipts_count' => $this->client->receipts()->count(),
        ];
    }

    public function getRecentPayments(): Collection
    {
        return $this->client->payments()
            ->with(['allocation.property', 'property', 'receipt'])
            ->latest('paid_at')
            ->latest()
            ->limit(5)
            ->get();
    }

    public function getRecentReceipts(): Collection
    {
        return $this->client->receipts()
            ->with(['payment.allocation.property', 'payment.property'])
            ->latest('issued_at')
            ->latest('id')
            ->limit(5)
            ->get();
    }

    public function getRealtorRelationships(): Collection
    {
        $realtors = $this->client->realtors()->get();

        if ($this->client->realtor && ! $realtors->contains('id', $this->client->realtor->id)) {
            $realtors->prepend($this->client->realtor);
        }

        return $realtors->values();
    }

    public function getPaymentHistory(): array
    {
        $payments = $this->client->payments()
            ->with(['allocation.property', 'property', 'receipt'])
            ->latest('paid_at')
            ->latest()
            ->get();

        return [
            'payments' => $payments,
            'status_breakdown' => $payments->groupBy(fn ($payment) => $payment->status?->value ?? $payment->status)
                ->map(fn ($group) => $group->count()),
            'total_paid' => (float) $payments
                ->filter(fn ($payment) => ($payment->status?->value ?? $payment->status) === PaymentStatus::Confirmed->value)
                ->sum('amount'),
            'total_pending' => (float) $payments
                ->filter(fn ($payment) => ($payment->status?->value ?? $payment->status) === PaymentStatus::Pending->value)
                ->sum('amount'),
        ];
    }

    public function getReceipts(): Collection
    {
        return $this->client->receipts()
            ->with(['payment.allocation.property', 'payment.property'])
            ->latest('issued_at')
            ->latest('id')
            ->get();
    }

    public function getOutstandingBalances(): Collection
    {
        return $this->getAllocations()
            ->filter(fn ($allocation) => $allocation->outstandingAmount() > 0)
            ->map(fn ($allocation) => [
                'allocation_id' => $allocation->id,
                'property' => [
                    'id' => $allocation->property?->id,
                    'title' => $allocation->property?->title,
                    'location' => $allocation->property?->location,
                ],
                'total_amount' => (float) $allocation->total_amount,
                'paid_amount' => $allocation->paidAmount(),
                'outstanding_amount' => $allocation->outstandingAmount(),
                'payment_progress' => $allocation->paymentProgress(),
                'status' => $allocation->status?->value ?? $allocation->status,
                'allocated_at' => $allocation->allocated_at?->toISOString(),
            ])
            ->values();
    }
}
