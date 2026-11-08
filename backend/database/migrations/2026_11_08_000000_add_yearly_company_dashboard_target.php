<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE company_settings MODIFY target_type ENUM('weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::table('company_settings')->where('target_type', 'yearly')->update(['target_type' => 'monthly']);
            DB::statement("ALTER TABLE company_settings MODIFY target_type ENUM('weekly', 'monthly') NOT NULL DEFAULT 'monthly'");
        }
    }
};
