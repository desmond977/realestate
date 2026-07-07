<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->string('payment_duration', 32)->default('one_time')->after('payment_plan');
            $table->unsignedInteger('custom_duration_value')->nullable()->after('payment_duration');
            $table->string('custom_duration_unit', 16)->nullable()->after('custom_duration_value');
        });
    }

    public function down(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->dropColumn([
                'payment_duration',
                'custom_duration_value',
                'custom_duration_unit',
            ]);
        });
    }
};
