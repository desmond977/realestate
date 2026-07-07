<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->index('payment_type');
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->index('issued_at');
        });

        Schema::table('allocations', function (Blueprint $table) {
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->dropIndex(['status', 'created_at']);
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropIndex(['issued_at']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['payment_type']);
        });
    }
};
