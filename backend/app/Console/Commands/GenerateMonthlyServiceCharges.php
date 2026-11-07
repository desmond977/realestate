<?php

namespace App\Console\Commands;

use App\Models\RentalAgreement;
use App\Models\Client;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateMonthlyServiceCharges extends Command
{
    protected $signature = 'service-charges:generate-monthly {--month= : Billing month in YYYY-MM format (defaults to current month)}';

    protected $description = 'Create the monthly service charge for each applicable active tenancy';

    public function handle(): int
    {
        $month = $this->option('month')
            ? CarbonImmutable::createFromFormat('Y-m', $this->option('month'))->startOfMonth()
            : CarbonImmutable::now()->startOfMonth();
        $monthKey = $month->format('Y-m');
        $start = $month->startOfMonth();
        $end = $month->endOfMonth();
        [$removedDuplicates, $preservedDuplicates] = $this->cleanExactUnpaidDuplicates();
        $created = 0;
        RentalAgreement::query()
            ->where('status', 'active')
            ->whereDate('lease_start_date', '<=', $end->toDateString())
            ->whereDate('lease_end_date', '>=', $start->toDateString())
            ->with(['rentalProperty', 'client'])
            ->chunkById(100, function ($agreements) use ($monthKey, $start, $end, &$created): void {
                foreach ($agreements as $agreement) {
                    $categories = ServiceChargeCategory::query()
                        ->where('tenant_id', $agreement->tenant_id)
                        ->where('is_active', true)
                        ->whereNotNull('monthly_amount')
                        ->where('monthly_amount', '>', 0)
                        ->get();
                    foreach ($categories as $category) {
                        $created += DB::transaction(function () use ($agreement, $category, $monthKey, $start, $end): int {
                            Client::query()->whereKey($agreement->client_id)->lockForUpdate()->firstOrFail();

                            $exists = ServiceCharge::withTrashed()
                                ->where('client_id', $agreement->client_id)
                                ->where('tenant_id', $agreement->tenant_id)
                                ->where('category_id', $category->id)
                                ->where(function ($query) use ($monthKey, $start, $end): void {
                                    $query->where('billing_month', $monthKey)
                                        ->orWhere(function ($legacy) use ($start, $end): void {
                                            $legacy->whereNull('billing_month')
                                                ->whereDate('billing_period_start', '>=', $start->toDateString())
                                                ->whereDate('billing_period_start', '<=', $end->toDateString());
                                        });
                                })
                                ->exists();
                            if ($exists) {
                                return 0;
                            }

                            $now = now();
                            return DB::table('service_charges')->insertOrIgnore([
                                'tenant_id' => $agreement->tenant_id,
                                'rental_agreement_id' => $agreement->id,
                                'category_id' => $category->id,
                                'rental_property_id' => $agreement->rental_property_id,
                                'client_id' => $agreement->client_id,
                                'description' => $category->name.' monthly service charge',
                                'billing_period_start' => $start->toDateString(),
                                'billing_period_end' => $end->toDateString(),
                                'billing_month' => $monthKey,
                                'billing_date' => $start->toDateString(),
                                'due_date' => $start->day(10)->toDateString(),
                                'amount_due' => $category->monthly_amount,
                                'created_at' => $now,
                                'updated_at' => $now,
                            ]);
                        });
                    }
                }
            });

        $this->info("Removed {$removedDuplicates} exact unpaid duplicate(s) and created {$created} service charge record(s) for {$monthKey}.");
        if ($preservedDuplicates > 0) {
            $this->warn("Preserved {$preservedDuplicates} duplicate group(s) with different charge details or payment/proof history.");
        }

        return self::SUCCESS;
    }

    /**
     * @return array{int, int}
     */
    private function cleanExactUnpaidDuplicates(): array
    {
        $groups = ServiceCharge::query()
            ->whereNull('billing_month')
            ->orderBy('id')
            ->get()
            ->filter(fn (ServiceCharge $charge): bool => $this->monthlyKey($charge) !== null)
            ->groupBy(fn (ServiceCharge $charge): string => implode(':', [
                $charge->tenant_id,
                $charge->client_id,
                $charge->rental_property_id,
                $charge->category_id,
                $this->monthlyKey($charge),
            ]));

        $removed = 0;
        $preserved = 0;

        foreach ($groups as $charges) {
            if ($charges->count() < 2) {
                continue;
            }

            $first = $charges->first();
            $areExactDuplicates = $charges->every(fn (ServiceCharge $charge): bool =>
                (float) $charge->amount_due === (float) $first->amount_due
                && $charge->billing_period_start?->toDateString() === $first->billing_period_start?->toDateString()
                && $charge->billing_period_end?->toDateString() === $first->billing_period_end?->toDateString()
            );
            $hasHistory = $charges->contains(fn (ServiceCharge $charge): bool =>
                $charge->payments()->exists() || $charge->paymentProofSubmissions()->exists()
            );

            if (! $areExactDuplicates || $hasHistory) {
                $preserved++;

                continue;
            }

            foreach ($charges->skip(1) as $duplicate) {
                DB::transaction(function () use ($duplicate): void {
                    $duplicate->forceFill(['billing_month' => null])->save();
                    $duplicate->delete();
                });
                $removed++;
            }
        }

        return [$removed, $preserved];
    }

    private function monthlyKey(ServiceCharge $charge): ?string
    {
        if ($charge->billing_month) {
            return $charge->billing_month;
        }

        $start = $charge->billing_period_start;
        $end = $charge->billing_period_end;
        if (! $start || ! $end || $start->format('Y-m') !== $end->format('Y-m') || $start->day !== 1 || ! $end->isLastOfMonth()) {
            return null;
        }

        return $start->format('Y-m');
    }
}
