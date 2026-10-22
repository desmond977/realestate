<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->decimal('original_price', 15, 2)->nullable();
            $table->string('discount_type', 20)->nullable();
            $table->decimal('discount_value', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
        });

        DB::table('allocations')
            ->whereNull('original_price')
            ->update(['original_price' => DB::raw('total_amount')]);
    }

    public function down(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->dropColumn([
                'original_price',
                'discount_type',
                'discount_value',
                'discount_amount',
            ]);
        });
    }
};
