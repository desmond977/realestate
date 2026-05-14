<?php

use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->nullable()->constrained()->cascadeOnUpdate()->nullOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 15, 2);
            $table->enum('payment_type', array_column(PaymentPlan::cases(), 'value'));
            $table->string('payment_method')->nullable();
            $table->enum('status', array_column(PaymentStatus::cases(), 'value'))
                ->default(PaymentStatus::Confirmed->value)
                ->index();
            $table->string('transaction_reference')->nullable()->unique();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['client_id', 'property_id']);
            $table->index(['paid_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
