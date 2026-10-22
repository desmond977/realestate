<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_payments', function (Blueprint $table) {
            $table->foreignId('payment_proof_submission_id')->nullable()->unique()
                ->constrained('payment_proof_submissions')->cascadeOnUpdate()->restrictOnDelete();
        });

        Schema::table('service_charge_payments', function (Blueprint $table) {
            $table->foreignId('payment_proof_submission_id')->nullable()->unique()
                ->constrained('payment_proof_submissions')->cascadeOnUpdate()->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('service_charge_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_proof_submission_id');
        });

        Schema::table('rental_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('payment_proof_submission_id');
        });

    }
};
