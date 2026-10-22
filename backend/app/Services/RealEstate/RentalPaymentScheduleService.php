<?php

namespace App\Services\RealEstate;

use App\Enums\RentalFrequency;
use App\Models\RentalAgreement;
use App\Models\RentalPaymentPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class RentalPaymentScheduleService
{
    public function ensurePeriods(RentalAgreement $agreement): void
    {
        DB::transaction(function () use ($agreement): void {
            $agreement = RentalAgreement::query()
                ->lockForUpdate()
                ->findOrFail($agreement->id);

            $leaseStart = CarbonImmutable::parse($agreement->lease_start_date->toDateString());
            $leaseEnd = CarbonImmutable::parse($agreement->lease_end_date->toDateString());
            $frequency = $agreement->rental_frequency;

            for ($index = 0; ; $index++) {
                $periodStart = $this->periodStart($leaseStart, $frequency, $index);

                if ($periodStart->greaterThan($leaseEnd)) {
                    break;
                }

                $nextPeriodStart = $this->periodStart($leaseStart, $frequency, $index + 1);
                $periodEnd = $nextPeriodStart->subDay()->min($leaseEnd);

                $periodStartDate = $periodStart->toDateString();
                $periodExists = $agreement->paymentPeriods()
                    ->whereDate('period_start', $periodStartDate)
                    ->exists();

                if (! $periodExists) {
                    $agreement->paymentPeriods()->create([
                        'period_start' => $periodStartDate,
                        'period_end' => $periodEnd->toDateString(),
                        'due_date' => $periodStartDate,
                        'amount_due' => $agreement->rental_amount,
                    ]);
                }
            }
        });
    }

    private function periodStart(CarbonImmutable $leaseStart, RentalFrequency $frequency, int $index): CarbonImmutable
    {
        return match ($frequency) {
            RentalFrequency::Weekly => $leaseStart->addWeeks($index),
            RentalFrequency::Biweekly => $leaseStart->addWeeks($index * 2),
            RentalFrequency::Monthly => $leaseStart->addMonthsNoOverflow($index),
            RentalFrequency::Quarterly => $leaseStart->addMonthsNoOverflow($index * 3),
            RentalFrequency::Annually => $leaseStart->addYearsNoOverflow($index),
        };
    }
}
