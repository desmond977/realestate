<?php

namespace App\Services\Dashboard;

use App\Enums\AllocationStatus;
use App\Enums\PaymentStatus;
use App\Enums\PropertyStatus;
use App\Enums\RentalPaymentStatus;
use App\Enums\ServiceChargePaymentStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Realtor;
use App\Models\RealtorLeaderboardSnapshot;
use App\Models\RentalPayment;
use App\Models\ServiceChargePayment;
use App\Services\CompanySettings;
use App\Services\TenantManager;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $now = Carbon::now();
        $this->archiveCompletedMonthLeaderboard($now->copy()->subMonthNoOverflow());
        $company = app(CompanySettings::class)->get();
        $targetType = $company['target_type'] ?? 'monthly';
        $targetAmount = (float) ($company['target_amount'] ?? 5000000.0);
        $targetWindow = $targetType === 'weekly'
            ? $now->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d')
            : $now->format('Y-m');

        $key = 'dashboard_summary:'.(app(TenantManager::class)->currentId() ?? 'default')
            .':'.$now->format('Y-m')
            .':'.$targetType
            .':'.$targetAmount
            .':'.$targetWindow;

        return Cache::remember($key, now()->addSeconds(60), function () use ($now, $targetType, $targetAmount) {
            $revenue = $this->revenueForPeriod();
            $monthStart = $now->copy()->startOfMonth();
            $monthEnd = $now->copy()->endOfMonth();
            $monthlyRevenue = $this->revenueForPeriod($monthStart, $monthEnd);
            $targetStart = $targetType === 'weekly'
                ? $now->copy()->startOfWeek(Carbon::MONDAY)
                : $monthStart;
            $targetEnd = $targetType === 'weekly'
                ? $now->copy()->endOfWeek(Carbon::SUNDAY)
                : $monthEnd;
            $targetRevenue = $targetType === 'monthly'
                ? $monthlyRevenue
                : $this->revenueForPeriod($targetStart, $targetEnd);
            $leaderboardMonth = $now->copy()->startOfMonth();

            return [
                'stats' => [
                    'total_properties' => Property::query()->count(),
                    'available_properties' => Property::query()->where('status', PropertyStatus::Available)->count(),
                    'reserved_properties' => Property::query()->where('status', PropertyStatus::Reserved)->count(),
                    'sold_properties' => Property::query()->where('status', PropertyStatus::Sold)->count(),
                    'total_plots' => (int) Property::query()->sum('property_count'),
                    'available_plots' => (int) Property::query()->sum('available_count'),
                    'reserved_plots' => (int) Property::query()->sum('reserved_count'),
                    'sold_plots' => (int) Property::query()->sum('sold_count'),
                    'total_clients' => Client::query()->count(),
                    'total_realtors' => Realtor::query()->count(),
                    'revenue' => $revenue,
                    'monthly_revenue' => $monthlyRevenue,
                    'outstanding_balances' => (float) Allocation::query()
                        ->whereIn('status', [AllocationStatus::Reserved, AllocationStatus::Active])
                        ->sum('balance'),
                    'active_allocations' => Allocation::query()->where('status', AllocationStatus::Active)->count(),
                    'completed_allocations' => Allocation::query()->where('status', AllocationStatus::Completed)->count(),
                ],
                'target_type' => $targetType,
                'target_amount' => $targetAmount,
                'monthly_target' => $targetAmount,
                'target_revenue' => $targetRevenue,
                'target_progress' => $this->targetProgress($targetRevenue, $targetAmount),
                'monthly_target_progress' => $this->targetProgress($targetRevenue, $targetAmount),
                'property_status_breakdown' => $this->propertyStatusBreakdown(),
                'property_inventory_breakdown' => $this->propertyInventoryBreakdown(),
                'allocation_status_breakdown' => $this->allocationStatusBreakdown(),
                'recent_payments' => $this->recentPayments(),
                'recent_allocations' => $this->recentAllocations(),
                'top_realtors' => $this->topRealtors($leaderboardMonth, $now->copy()->endOfMonth()),
                'realtor_leaderboard_period' => [
                    'key' => $leaderboardMonth->format('Y-m'),
                    'label' => $leaderboardMonth->format('F Y'),
                    'starts_at' => $leaderboardMonth->toDateString(),
                    'ends_at' => $leaderboardMonth->copy()->endOfMonth()->toDateString(),
                ],
                'previous_realtor_leaderboard_snapshot' => $this->previousLeaderboardSnapshot($leaderboardMonth),
            ];
        });
    }

    private function revenueForPeriod(?Carbon $start = null, ?Carbon $end = null): float
    {
        return $this->confirmedPaymentSum(Payment::class, PaymentStatus::Confirmed, $start, $end)
            + $this->confirmedPaymentSum(RentalPayment::class, RentalPaymentStatus::Confirmed, $start, $end)
            + $this->confirmedPaymentSum(ServiceChargePayment::class, ServiceChargePaymentStatus::Confirmed, $start, $end);
    }

    private function confirmedPaymentSum(string $modelClass, mixed $status, ?Carbon $start, ?Carbon $end): float
    {
        $query = $modelClass::query()->where('status', $status);

        if ($start && $end) {
            $query->whereBetween('paid_at', [$start, $end]);
        }

        return (float) $query->sum('amount');
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

    private function topRealtors(Carbon $startOfMonth, Carbon $endOfMonth): Collection
    {
        return $this->realtorLeaderboardForPeriod($startOfMonth, $endOfMonth, 5, true);
    }

    private function realtorLeaderboardForPeriod(
        Carbon $startOfMonth,
        Carbon $endOfMonth,
        ?int $limit = 5,
        bool $onlyWithActivity = false
    ): Collection {
        $realtors = Realtor::query()
            ->withSum(['payments as confirmed_revenue' => function ($query) {
                $query->where('status', PaymentStatus::Confirmed);
            }], 'amount')
            ->withSum(['payments as monthly_confirmed_revenue' => function ($query) use ($startOfMonth, $endOfMonth) {
                $query
                    ->where('status', PaymentStatus::Confirmed)
                    ->whereBetween('paid_at', [$startOfMonth, $endOfMonth]);
            }], 'amount')
            ->withSum(['payments as installment_totals' => function ($query) {
                $query
                    ->where('status', PaymentStatus::Confirmed)
                    ->where('payment_type', 'installment');
            }], 'amount')
            ->withSum(['payments as monthly_installment_totals' => function ($query) use ($startOfMonth, $endOfMonth) {
                $query
                    ->where('status', PaymentStatus::Confirmed)
                    ->where('payment_type', 'installment')
                    ->whereBetween('paid_at', [$startOfMonth, $endOfMonth]);
            }], 'amount')
            ->withSum(['allocations as outstanding_balances' => function ($query) {
                $query->whereIn('status', [AllocationStatus::Reserved, AllocationStatus::Active]);
            }], 'balance')
            ->withCount([
                'clients',
                'clients as monthly_clients_count' => function ($query) use ($startOfMonth, $endOfMonth) {
                    $query->whereBetween('created_at', [$startOfMonth, $endOfMonth]);
                },
                'allocations',
                'allocations as properties_sold_count' => function ($query) {
                    $query->where('status', AllocationStatus::Completed);
                },
                'allocations as monthly_properties_sold_count' => function ($query) use ($startOfMonth, $endOfMonth) {
                    $query
                        ->where('status', AllocationStatus::Completed)
                        ->whereBetween('updated_at', [$startOfMonth, $endOfMonth]);
                },
            ])
            ->orderByDesc('monthly_properties_sold_count')
            ->orderByDesc('monthly_confirmed_revenue')
            ->orderByDesc('monthly_clients_count')
            ->orderBy('full_name')
            ->get();

        if ($onlyWithActivity) {
            $realtors = $realtors->filter(fn (Realtor $realtor) => (
                (int) ($realtor->monthly_properties_sold_count ?? 0) > 0
                || (float) ($realtor->monthly_confirmed_revenue ?? 0) > 0
            ));
        }

        return $limit === null
            ? $realtors->values()
            : $realtors->take($limit)->values();
    }

    private function archiveCompletedMonthLeaderboard(Carbon $month): void
    {
        $tenantId = app(TenantManager::class)->currentId() ?? 1;
        $startOfMonth = $month->copy()->startOfMonth();
        $endOfMonth = $month->copy()->endOfMonth();

        if (RealtorLeaderboardSnapshot::query()
            ->where('tenant_id', $tenantId)
            ->whereDate('leaderboard_month', $startOfMonth->toDateString())
            ->exists()) {
            return;
        }

        $leaderboard = $this->realtorLeaderboardForPeriod($startOfMonth, $endOfMonth, null, true)
            ->map(fn (Realtor $realtor, int $index) => [
                'rank' => $index + 1,
                'realtor_id' => $realtor->id,
                'full_name' => $realtor->full_name,
                'company_name' => $realtor->company_name,
                'monthly_properties_sold_count' => (int) ($realtor->monthly_properties_sold_count ?? 0),
                'monthly_confirmed_revenue' => (float) ($realtor->monthly_confirmed_revenue ?? 0),
                'monthly_installment_totals' => (float) ($realtor->monthly_installment_totals ?? 0),
                'monthly_clients_count' => (int) ($realtor->monthly_clients_count ?? 0),
                'outstanding_balances' => (float) ($realtor->outstanding_balances ?? 0),
            ]);

        RealtorLeaderboardSnapshot::query()->updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'leaderboard_month' => $startOfMonth->toDateString(),
            ],
            [
                'leaderboard' => $leaderboard->values()->all(),
                'entries_count' => $leaderboard->count(),
                'archived_at' => now(),
            ],
        );
    }

    private function previousLeaderboardSnapshot(Carbon $currentMonth): ?array
    {
        $snapshot = RealtorLeaderboardSnapshot::query()
            ->whereDate('leaderboard_month', $currentMonth->copy()->subMonthNoOverflow()->toDateString())
            ->first();

        if (! $snapshot) {
            return null;
        }

        return [
            'leaderboard_month' => $snapshot->leaderboard_month?->format('Y-m'),
            'label' => $snapshot->leaderboard_month?->format('F Y'),
            'leaderboard' => $snapshot->leaderboard,
            'entries_count' => $snapshot->entries_count,
            'archived_at' => $snapshot->archived_at?->toISOString(),
        ];
    }

    /**
     * @return array<int, array{status: string, count: int}>
     */
    private function propertyInventoryBreakdown(): array
    {
        return [
            ['status' => 'available', 'count' => (int) Property::query()->sum('available_count')],
            ['status' => 'reserved', 'count' => (int) Property::query()->sum('reserved_count')],
            ['status' => 'sold', 'count' => (int) Property::query()->sum('sold_count')],
        ];
    }

    private function targetProgress(float $revenue, float $target): int
    {
        if ($target <= 0) {
            return 0;
        }

        return min(100, (int) round(($revenue / $target) * 100));
    }
}
