<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql' || ! Schema::hasTable('allocations')) {
            return;
        }

        DB::statement("ALTER TABLE allocations MODIFY status ENUM('reserved', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql' || ! Schema::hasTable('allocations')) {
            return;
        }

        DB::statement("ALTER TABLE allocations MODIFY status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active'");
    }
};
