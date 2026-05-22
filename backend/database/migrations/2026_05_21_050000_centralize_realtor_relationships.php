<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('allocations', function (Blueprint $table) {
            $table->foreignId('realtor_id')
                ->nullable()
                ->after('client_id')
                ->constrained()
                ->nullOnDelete();

            $table->index(['realtor_id', 'allocated_at']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('realtor_id')
                ->nullable()
                ->after('client_id')
                ->constrained()
                ->nullOnDelete();

            $table->index(['realtor_id', 'paid_at']);
        });

        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'referred_by')) {
                $table->dropColumn('referred_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'referred_by')) {
                $table->string('referred_by')->nullable()->after('occupation');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('realtor_id');
        });

        Schema::table('allocations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('realtor_id');
        });
    }
};
