<?php

namespace App\Services\Dashboard;

use App\Enums\RentalPaymentStatus;
use App\Enums\RentalStatus;
use App\Enums\ServiceChargePaymentStatus;
use App\Models\RentalPayment;
use App\Models\RentalPaymentPeriod;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargePayment;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class RentalDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(string $period): array
    {
        [$from, $to, $interval] = $this->dateRange($period);
        $range = [$from, $to];
        $rentBalances = $this->rentBalances();
        $serviceChargeBalances = $this->serviceChargeBalances($range);
        $totalRentalProperties = $this->rentalPropertyCount();
        $occupiedRentalProperties = $this->occupiedPropertyCount();

        return [
            'period' => [
                'key' => $period,
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'stats' => [
                'rental_revenue_collected' => (float) RentalPayment::query()
                    ->where('status', RentalPaymentStatus::Confirmed->value)
                    ->whereBetween('paid_at', $range)
                    ->sum('amount'),
                'outstanding_rent' => $rentBalances['outstanding_rent'],
                'overdue_rent' => $rentBalances['overdue_rent'],
                'total_rental_properties' => $totalRentalProperties,
                'occupied_rental_properties' => $occupiedRentalProperties,
                'vacant_rental_properties' => max(0, $totalRentalProperties - $occupiedRentalProperties),
            ],
            'revenue_trend' => $this->revenueTrend($from, $to, $interval),
            'upcoming_rent_due' => $this->upcomingRentDue(),
            'recent_rental_payments' => $this->recentRentalPayments($range),
            'service_charges' => [
                'amount_billed' => (float) ServiceCharge::query()
                    ->whereBetween('billing_date', [$from->toDateString(), $to->toDateString()])
                    ->sum('amount_due'),
                'amount_collected' => (float) ServiceChargePayment::query()
                    ->where('status', ServiceChargePaymentStatus::Confirmed->value)
                    ->whereBetween('paid_at', $range)
                    ->whereHas('serviceCharge')
                    ->sum('amount'),
                'outstanding_balance' => $serviceChargeBalances,
            ],
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon, 2: string}
     */
    private function dateRange(string $period): array
    {
        $to = Carbon::now()->endOfDay();

        if ($period === '30_days') {
            return [$to->copy()->subDays(29)->startOfDay(), $to, 'day'];
        }

        if ($period === '90_days') {
            return [$to->copy()->subDays(89)->startOfDay(), $to, 'day'];
        }

        return [$to->copy()->subMonthsNoOverflow(11)->startOfMonth(), $to, 'month'];
    }

    /**
     * @return array{outstanding_rent: float, overdue_rent: float}
     */
    private function rentBalances(): array
    {
        $today = Carbon::today()->toDateString();
        $confirmedPayments = RentalPayment::query()
            ->select('rental_payment_period_id')
            ->selectRaw('SUM(amount) AS confirmed_amount_paid')
            ->where('status', RentalPaymentStatus::Confirmed->value)
            ->groupBy('rental_payment_period_id');

        $balances = RentalPaymentPeriod::query()
            ->whereHas('rentalAgreement', fn ($query) => $query->whereIn('status', [
                RentalStatus::Active->value,
                RentalStatus::Expired->value,
                RentalStatus::Terminated->value,
            ]))
            ->leftJoinSub($confirmedPayments, 'confirmed_rental_payments', function (JoinClause $join) {
                $join->on('confirmed_rental_payments.rental_payment_period_id', '=', 'rental_payment_periods.id');
            })
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN rental_payment_periods.due_date <= ? AND rental_payment_periods.amount_due > COALESCE(confirmed_rental_payments.confirmed_amount_paid, 0) '.
                'THEN rental_payment_periods.amount_due - COALESCE(confirmed_rental_payments.confirmed_amount_paid, 0) ELSE 0 END), 0) AS outstanding_rent',
                [$today]
            )
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN rental_payment_periods.due_date < ? AND rental_payment_periods.amount_due > COALESCE(confirmed_rental_payments.confirmed_amount_paid, 0) '.
                'THEN rental_payment_periods.amount_due - COALESCE(confirmed_rental_payments.confirmed_amount_paid, 0) ELSE 0 END), 0) AS overdue_rent',
                [$today]
            )
            ->first();

        return [
            'outstanding_rent' => (float) $balances->outstanding_rent,
            'overdue_rent' => (float) $balances->overdue_rent,
        ];
    }

    private function rentalPropertyCount(): int
    {
        return RentalProperty::query()->count();
    }

    private function occupiedPropertyCount(): int
    {
        return RentalProperty::query()
            ->whereHas('agreements', fn ($query) => $query
                ->where('status', RentalStatus::Active->value)
                ->whereDate('lease_start_date', '<=', Carbon::today()->toDateString())
                ->whereDate('lease_end_date', '>=', Carbon::today()->toDateString()))
            ->count();
    }

    /**
     * @return Collection<int, array{period: string, label: string, amount: float}>
     */
    private function revenueTrend(Carbon $from, Carbon $to, string $interval): Collection
    {
        $driver = DB::connection()->getDriverName();
        $bucketExpression = $interval === 'day'
            ? 'DATE(paid_at)'
            : match ($driver) {
                'sqlite' => "strftime('%Y-%m-01', paid_at)",
                default => "DATE_FORMAT(paid_at, '%Y-%m-01')",
            };

        $amounts = RentalPayment::query()
            ->selectRaw("{$bucketExpression} AS bucket, SUM(amount) AS amount")
            ->where('status', RentalPaymentStatus::Confirmed->value)
            ->whereBetween('paid_at', [$from, $to])
            ->groupByRaw($bucketExpression)
            ->orderByRaw($bucketExpression)
            ->get()
            ->keyBy('bucket');

        $firstBucket = $interval === 'day' ? $from->copy()->startOfDay() : $from->copy()->startOfMonth();
        $lastBucket = $interval === 'day' ? $to->copy()->startOfDay() : $to->copy()->startOfMonth();
        $buckets = CarbonPeriod::create(
            $firstBucket,
            $interval === 'day' ? '1 day' : '1 month',
            $lastBucket
        );

        return collect($buckets)->map(function (Carbon $bucket) use ($amounts, $interval) {
            $key = $bucket->toDateString();

            return [
                'period' => $key,
                'label' => $interval === 'day' ? $bucket->format('M j') : $bucket->format('M Y'),
                'amount' => (float) ($amounts->get($key)->amount ?? 0),
            ];
        })->values();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function upcomingRentDue(): Collection
    {
        $confirmedPayments = RentalPayment::query()
            ->select('rental_payment_period_id')
            ->selectRaw('SUM(amount) AS confirmed_amount_paid')
            ->where('status', RentalPaymentStatus::Confirmed->value)
            ->groupBy('rental_payment_period_id');

        return RentalPaymentPeriod::query()
            ->leftJoinSub($confirmedPayments, 'confirmed_rental_payments', function (JoinClause $join) {
                $join->on('confirmed_rental_payments.rental_payment_period_id', '=', 'rental_payment_periods.id');
            })
            ->select('rental_payment_periods.*')
            ->selectRaw('COALESCE(confirmed_rental_payments.confirmed_amount_paid, 0) AS amount_paid')
            ->selectRaw('rental_payment_periods.amount_due - COALESCE(confirmed_rental_payments.confirmed_amount_paid, 0) AS balance')
            ->whereHas('rentalAgreement', fn ($query) => $query->where('status', RentalStatus::Active->value))
            ->whereBetween('due_date', [Carbon::today()->toDateString(), Carbon::today()->addDays(30)->toDateString()])
            ->whereRaw('rental_payment_periods.amount_due > COALESCE(confirmed_rental_payments.confirmed_amount_paid, 0)')
            ->with(['rentalAgreement.client', 'rentalAgreement.rentalProperty.property'])
            ->orderBy('due_date')
            ->limit(8)
            ->get()
            ->map(fn (RentalPaymentPeriod $period) => [
                'id' => $period->id,
                'due_date' => $period->due_date->toDateString(),
                'period_start' => $period->period_start->toDateString(),
                'period_end' => $period->period_end->toDateString(),
                'amount_due' => (float) $period->amount_due,
                'amount_paid' => (float) $period->amount_paid,
                'balance' => (float) $period->balance,
                'rental_agreement' => [
                    'id' => $period->rentalAgreement->id,
                    'client' => [
                        'id' => $period->rentalAgreement->client->id,
                        'full_name' => $period->rentalAgreement->client->full_name,
                    ],
                    'rental_property' => [
                        'id' => $period->rentalAgreement->rentalProperty->id,
                        'name' => $period->rentalAgreement->rentalProperty->name
                            ?: $period->rentalAgreement->rentalProperty->property?->title,
                    ],
                ],
            ]);
    }

    /**
     * @param  array{0: Carbon, 1: Carbon}  $range
     * @return Collection<int, array<string, mixed>>
     */
    private function recentRentalPayments(array $range): Collection
    {
        return RentalPayment::query()
            ->where('status', RentalPaymentStatus::Confirmed->value)
            ->whereBetween('paid_at', $range)
            ->with(['period.rentalAgreement.client', 'period.rentalAgreement.rentalProperty.property'])
            ->latest('paid_at')
            ->limit(8)
            ->get()
            ->map(fn (RentalPayment $payment) => [
                'id' => $payment->id,
                'rental_payment_period_id' => $payment->rental_payment_period_id,
                'amount' => (float) $payment->amount,
                'paid_at' => $payment->paid_at?->toISOString(),
                'payment_method' => $payment->payment_method,
                'transaction_reference' => $payment->transaction_reference,
                'rental_agreement' => [
                    'client' => [
                        'full_name' => $payment->period?->rentalAgreement?->client?->full_name,
                    ],
                    'rental_property' => [
                        'name' => $payment->period?->rentalAgreement?->rentalProperty?->name
                            ?: $payment->period?->rentalAgreement?->rentalProperty?->property?->title,
                    ],
                ],
            ]);
    }

    /**
     * @param  array{0: Carbon, 1: Carbon}  $range
     */
    private function serviceChargeBalances(array $range): float
    {
        $confirmedPayments = ServiceChargePayment::query()
            ->select('service_charge_id')
            ->selectRaw('SUM(amount) AS confirmed_amount_paid')
            ->where('status', ServiceChargePaymentStatus::Confirmed->value)
            ->groupBy('service_charge_id');

        $balance = ServiceCharge::query()
            ->whereBetween('billing_date', [$range[0]->toDateString(), $range[1]->toDateString()])
            ->leftJoinSub($confirmedPayments, 'confirmed_service_charge_payments', function (JoinClause $join) {
                $join->on('confirmed_service_charge_payments.service_charge_id', '=', 'service_charges.id');
            })
            ->selectRaw(
                'COALESCE(SUM(CASE WHEN service_charges.amount_due > COALESCE(confirmed_service_charge_payments.confirmed_amount_paid, 0) '.
                'THEN service_charges.amount_due - COALESCE(confirmed_service_charge_payments.confirmed_amount_paid, 0) ELSE 0 END), 0) AS outstanding_balance'
            )
            ->value('outstanding_balance');

        return (float) $balance;
    }
}
