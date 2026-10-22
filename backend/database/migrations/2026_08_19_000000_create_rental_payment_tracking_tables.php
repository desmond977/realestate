<?php

use App\Enums\RentalPaymentStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_payment_periods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_agreement_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->date('due_date');
            $table->decimal('amount_due', 15, 2);
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();

            $table->unique(['rental_agreement_id', 'period_start']);
            $table->index(['tenant_id', 'due_date']);
        });

        Schema::create('rental_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_payment_period_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamp('paid_at');
            $table->string('payment_method', 100);
            $table->string('transaction_reference')->nullable();
            $table->enum('status', RentalPaymentStatus::values())->default(RentalPaymentStatus::Pending->value);
            $table->string('proof_of_payment_path')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();

            $table->unique(['tenant_id', 'transaction_reference']);
            $table->index(['rental_payment_period_id', 'status']);
            $table->index(['tenant_id', 'paid_at']);
        });

        Schema::create('rental_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_payment_id')->unique()->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('receipt_number')->unique();
            $table->timestamp('issued_at');
            $table->json('snapshot');
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_receipts');
        Schema::dropIfExists('rental_payments');
        Schema::dropIfExists('rental_payment_periods');
    }
};
