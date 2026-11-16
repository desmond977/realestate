<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opay_rental_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_payment_period_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('reference')->unique();
            $table->string('order_no')->nullable()->unique();
            $table->string('transaction_id')->nullable()->unique();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('NGN');
            $table->string('status', 24)->default('pending')->index();
            $table->text('cashier_url')->nullable();
            $table->string('opay_status', 24)->nullable();
            $table->text('failure_reason')->nullable();
            $table->json('provider_payload')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('rental_payment_id')->nullable()->unique()->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();

            $table->index(['client_id', 'created_at']);
            $table->index(['rental_payment_period_id', 'status', 'expires_at'], 'opay_rental_period_reservations_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opay_rental_transactions');
    }
};
