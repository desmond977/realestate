<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('allocations', 'realtor_id')) {
            DB::table('allocations')
                ->whereNull('realtor_id')
                ->whereExists(function ($query) {
                    $query
                        ->select(DB::raw(1))
                        ->from('clients')
                        ->whereColumn('clients.id', 'allocations.client_id')
                        ->whereNotNull('clients.realtor_id');
                })
                ->update([
                    'realtor_id' => DB::raw('(SELECT clients.realtor_id FROM clients WHERE clients.id = allocations.client_id)'),
                ]);
        }

        if (Schema::hasColumn('payments', 'realtor_id')) {
            DB::table('payments')
                ->whereNull('realtor_id')
                ->whereExists(function ($query) {
                    $query
                        ->select(DB::raw(1))
                        ->from('allocations')
                        ->whereColumn('allocations.id', 'payments.allocation_id')
                        ->whereNotNull('allocations.realtor_id');
                })
                ->update([
                    'realtor_id' => DB::raw('(SELECT allocations.realtor_id FROM allocations WHERE allocations.id = payments.allocation_id)'),
                ]);
        }
    }

    public function down(): void
    {
        // Historical backfill only; no destructive rollback.
    }
};
