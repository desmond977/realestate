<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->default(1)->index();
            $table->foreignId('allocation_id')->constrained()->cascadeOnDelete()->index();
            $table->string('reminder_type', 16);
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->unique(['allocation_id', 'reminder_type']);
            $table->index(['tenant_id', 'sent_at', 'reminder_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_reminders');
    }
};
