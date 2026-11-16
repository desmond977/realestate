<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('paystack_client_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('category', 24);
            $table->foreignId('rental_payment_period_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('service_charge_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('reference', 64)->unique();
            $table->unsignedBigInteger('provider_transaction_id')->nullable()->unique();
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3)->default('NGN');
            $table->string('status', 16)->default('pending');
            $table->string('authorization_url', 2048)->nullable();
            $table->string('access_code', 255)->nullable();
            $table->string('failure_reason')->nullable();
            $table->json('provider_payload')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('rental_payment_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('service_charge_payment_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->index(['category', 'status', 'expires_at']);
            $table->index(['client_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paystack_client_transactions');
    }
};
