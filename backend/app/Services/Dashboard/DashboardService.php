<?php

namespace App\Services\Dashboard;

use App\Enums\AllocationStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Realtor;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $revenue = (float) Payment::query()
            ->where('status', PaymentStatus::Confirmed)
            ->sum('amount');

        $monthlyTarget = 5000000.0;

        return [
            'stats' => [
                'total_properties' => Property::query()->count(),
                'available_properties' => Property::query()->where('status', PropertyStatus::Available)->count(),
                'reserved_properties' => Property::query()->where('status', PropertyStatus::Reserved)->count(),
                'sold_properties' => Property::query()->where('status', PropertyStatus::Sold)->count(),
                'total_clients' => Client::query()->count(),
                'total_realtors' => Realtor::query()->count(),
                'revenue' => $revenue,
                'outstanding_balances' => (float) Allocation::query()
                    ->where('status', AllocationStatus::Active)
                    ->sum('balance'),
                'active_allocations' => Allocation::query()->where('status', AllocationStatus::Active)->count(),
                'completed_allocations' => Allocation::query()->where('status', AllocationStatus::Completed)->count(),
            ],
            'monthly_target' => $monthlyTarget,
            'monthly_target_progress' => $this->targetProgress($revenue, $monthlyTarget),
            'property_status_breakdown' => $this->propertyStatusBreakdown(),
            'allocation_status_breakdown' => $this->allocationStatusBreakdown(),
            'recent_payments' => $this->recentPayments(),
            'recent_allocations' => $this->recentAllocations(),
            'top_realtors' => $this->topRealtors(),
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
            ->with(['client.realtor', 'realtor', 'property', 'receipt'])
            ->latest('paid_at')
            ->limit(5)
            ->get();
    }

    private function recentAllocations(): Collection
    {
        return Allocation::query()
            ->with(['client.realtor', 'realtor', 'property'])
            ->latest('allocated_at')
            ->limit(5)
            ->get();
    }

    private function topRealtors(): Collection
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        return Realtor::query()
            ->withSum(['payments as confirmed_revenue' => function ($query) {
                $query->where('status', PaymentStatus::Confirmed);
            }], 'amount')
            ->withCount([
                'clients',
                'allocations',
                'clients as monthly_clients_count' => function ($query) use ($startOfMonth, $endOfMonth) {
                    $query->whereBetween('created_at', [$startOfMonth, $endOfMonth]);
                },
            ])
            ->orderByDesc('monthly_clients_count')
            ->orderByDesc('clients_count')
            ->orderByDesc('confirmed_revenue')
            ->limit(5)
            ->get();
    }

    private function targetProgress(float $revenue, float $target): int
    {
        if ($target <= 0) {
            return 0;
        }

        return min(100, (int) round(($revenue / $target) * 100));
    }
}
