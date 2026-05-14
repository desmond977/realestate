<?php

namespace App\Services\Dashboard;

use App\Enums\AllocationStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use Illuminate\Support\Collection;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        return [
            'stats' => [
                'total_properties' => Property::query()->count(),
                'available_properties' => Property::query()->where('status', PropertyStatus::Available)->count(),
                'reserved_properties' => Property::query()->where('status', PropertyStatus::Reserved)->count(),
                'sold_properties' => Property::query()->where('status', PropertyStatus::Sold)->count(),
                'total_clients' => Client::query()->count(),
                'revenue' => (float) Payment::query()
                    ->where('status', PaymentStatus::Confirmed)
                    ->sum('amount'),
                'outstanding_balances' => (float) Allocation::query()
                    ->where('status', AllocationStatus::Active)
                    ->sum('balance'),
                'active_allocations' => Allocation::query()->where('status', AllocationStatus::Active)->count(),
                'completed_allocations' => Allocation::query()->where('status', AllocationStatus::Completed)->count(),
            ],
            'property_status_breakdown' => $this->propertyStatusBreakdown(),
            'allocation_status_breakdown' => $this->allocationStatusBreakdown(),
            'recent_payments' => $this->recentPayments(),
            'recent_allocations' => $this->recentAllocations(),
        ];
    }

    /**
     * @return array<int, array{status: string, count: int}>
     */
    private function propertyStatusBreakdown(): array
    {
        return collect(PropertyStatus::cases())
            ->map(fn (PropertyStatus $status) => [
                'status' => $status->value,
                'count' => Property::query()->where('status', $status)->count(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{status: string, count: int}>
     */
    private function allocationStatusBreakdown(): array
    {
        return collect(AllocationStatus::cases())
            ->map(fn (AllocationStatus $status) => [
                'status' => $status->value,
                'count' => Allocation::query()->where('status', $status)->count(),
            ])
            ->values()
            ->all();
    }

    private function recentPayments(): Collection
    {
        return Payment::query()
            ->with(['client', 'property', 'receipt'])
            ->latest('paid_at')
            ->limit(5)
            ->get();
    }

    private function recentAllocations(): Collection
    {
        return Allocation::query()
            ->with(['client', 'property'])
            ->latest('allocated_at')
            ->limit(5)
            ->get();
    }
}
