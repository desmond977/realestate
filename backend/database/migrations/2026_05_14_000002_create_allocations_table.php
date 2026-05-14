<?php

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('allocated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('total_amount', 15, 2);
            $table->decimal('amount_paid', 15, 2)->default(0);
            $table->decimal('balance', 15, 2)->default(0);
            $table->enum('payment_plan', array_column(PaymentPlan::cases(), 'value'));
            $table->enum('status', array_column(AllocationStatus::cases(), 'value'))
                ->default(AllocationStatus::Active->value)
                ->index();
            $table->date('allocated_at');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'property_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allocations');
    }
};
