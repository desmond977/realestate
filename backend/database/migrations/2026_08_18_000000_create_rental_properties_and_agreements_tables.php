<?php

use App\Enums\RentalFrequency;
use App\Enums\RentalStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rental_properties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->nullable()->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('name')->nullable();
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'property_id']);
        });

        Schema::create('rental_agreements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rental_property_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->decimal('rental_amount', 15, 2);
            $table->enum('rental_frequency', RentalFrequency::values());
            $table->date('lease_start_date');
            $table->date('lease_end_date');
            $table->enum('status', RentalStatus::values())->default(RentalStatus::Active->value);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['client_id', 'status']);
            $table->index(['lease_start_date', 'lease_end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rental_agreements');
        Schema::dropIfExists('rental_properties');
    }
};
