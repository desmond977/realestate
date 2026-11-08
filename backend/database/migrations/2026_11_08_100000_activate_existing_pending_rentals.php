<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('rental_agreements')
            ->where('status', 'pending')
            ->update(['status' => 'active']);
    }

    public function down(): void
    {
        // Do not revert active agreements to pending; active is now the default state.
    }
};
