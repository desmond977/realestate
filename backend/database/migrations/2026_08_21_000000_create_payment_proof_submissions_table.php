<?php

use App\Enums\PaymentProofSubmissionStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_proof_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->enum('payment_category', ['rental', 'service_charge']);
            $table->foreignId('rental_payment_period_id')->nullable()->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('service_charge_id')->nullable()->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->date('paid_at');
            $table->string('transaction_reference', 255);
            $table->string('proof_of_payment_path');
            $table->enum('status', PaymentProofSubmissionStatus::values())->default(PaymentProofSubmissionStatus::Pending->value);
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();

            $table->index(['client_id', 'status', 'created_at'], 'proof_submissions_client_status_idx');
            $table->index(['rental_payment_period_id', 'status'], 'proof_submissions_rental_period_idx');
            $table->index(['service_charge_id', 'status'], 'proof_submissions_service_charge_idx');
            $table->unique(['client_id', 'payment_category', 'transaction_reference'], 'proof_submissions_client_reference_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_proof_submissions');
    }
};
