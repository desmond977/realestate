<?php

use App\Enums\ServiceChargePaymentStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_charge_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'name']);
        });

        $now = now();
        DB::table('service_charge_categories')->insert([
            ['name' => 'Security', 'description' => 'Security and access control services.', 'is_system' => true, 'tenant_id' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Waste Management', 'description' => 'Waste collection and disposal services.', 'is_system' => true, 'tenant_id' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Maintenance', 'description' => 'Shared property maintenance services.', 'is_system' => true, 'tenant_id' => 1, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Other', 'description' => 'Other approved service charges.', 'is_system' => true, 'tenant_id' => 1, 'created_at' => $now, 'updated_at' => $now],
        ]);

        Schema::create('service_charges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('service_charge_categories')->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('rental_agreement_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('rental_property_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('description')->nullable();
            $table->date('billing_period_start');
            $table->date('billing_period_end');
            $table->date('billing_date');
            $table->date('due_date');
            $table->decimal('amount_due', 15, 2);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'due_date'], 'sc_charges_tenant_due_idx');
            $table->index(['rental_agreement_id', 'billing_period_start', 'billing_period_end'], 'sc_charges_agreement_period_idx');
            $table->index(['client_id', 'category_id'], 'sc_charges_client_category_idx');
        });

        Schema::create('service_charge_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_charge_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('amount', 15, 2);
            $table->timestamp('paid_at');
            $table->string('payment_method', 100);
            $table->string('transaction_reference')->nullable();
            $table->enum('status', ServiceChargePaymentStatus::values())->default(ServiceChargePaymentStatus::Pending->value);
            $table->string('proof_of_payment_path')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_notes')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();

            $table->unique(['tenant_id', 'transaction_reference']);
            $table->index(['service_charge_id', 'status']);
            $table->index(['tenant_id', 'paid_at']);
        });

        Schema::create('service_charge_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_charge_payment_id')->unique()->constrained()->cascadeOnUpdate()->restrictOnDelete();
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
        Schema::dropIfExists('service_charge_receipts');
        Schema::dropIfExists('service_charge_payments');
        Schema::dropIfExists('service_charges');
        Schema::dropIfExists('service_charge_categories');
    }
};
