<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('generated_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('allocation_id')->constrained()->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('clients')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreignId('document_template_id')->constrained()->cascadeOnUpdate()->restrictOnDelete();
            $table->string('document_type', 64)->index();
            $table->string('document_name');
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at')->index();
            $table->string('file_name');
            $table->json('data_snapshot')->nullable();
            $table->longText('content_html');
            $table->timestamps();

            $table->index(['allocation_id', 'document_template_id', 'generated_at'], 'gen_docs_alloc_template_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generated_documents');
    }
};
