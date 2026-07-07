<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allocation_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('document_template_id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->boolean('enabled')->default(false)->index();
            $table->foreignId('enabled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['allocation_id', 'document_template_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allocation_documents');
    }
};
