<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('allocations', 'payment_screenshot')) {
            return;
        }

        Schema::table('allocations', function (Blueprint $table) {
            $table->string('payment_screenshot')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('allocations', 'payment_screenshot')) {
            return;
        }

        Schema::table('allocations', function (Blueprint $table) {
            $table->dropColumn(['payment_screenshot']);
        });
    }
};
