<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $invalidBoundaryPeriods = DB::table('rental_payment_periods as periods')
            ->join('rental_agreements as agreements', 'agreements.id', '=', 'periods.rental_agreement_id')
            ->where('agreements.rental_frequency', 'annually')
            ->whereColumn('periods.period_start', '=', 'agreements.lease_end_date')
            ->whereColumn('periods.period_start', '<>', 'agreements.lease_start_date')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('rental_payments')
                    ->whereColumn('rental_payments.rental_payment_period_id', '=', 'periods.id');
            })
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('payment_proof_submissions')
                    ->whereColumn('payment_proof_submissions.rental_payment_period_id', '=', 'periods.id');
            })
            ->select('periods.id');

        DB::table('rental_payment_periods')->whereIn('id', $invalidBoundaryPeriods)->delete();
    }

    public function down(): void
    {
        // Removed periods are invalid one-day boundary charges and are not recreated on rollback.
    }
};
