<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->foreignId('realtor_id')
                ->nullable()
                ->after('occupation')
                ->constrained()
                ->nullOnDelete();

            $table->index(['realtor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('realtor_id');
        });
    }
};
