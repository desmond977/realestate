<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const TABLES = [
        'users',
        'company_settings',
        'properties',
        'clients',
        'realtors',
        'allocations',
        'payments',
        'receipts',
        'document_templates',
        'allocation_documents',
        'generated_documents',
    ];

    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('domain')->nullable()->unique();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        foreach (self::TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            });
        }

        foreach (self::TABLES as $tableName) {
            DB::statement("UPDATE {$tableName} SET tenant_id = 1 WHERE tenant_id IS NULL");
        }

        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
        });

        Schema::table('allocations', function (Blueprint $table) {
            $table->index('realtor_id');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->index('realtor_id');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['realtor_id']);
        });

        Schema::table('allocations', function (Blueprint $table) {
            $table->dropIndex(['realtor_id']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
        });

        foreach (array_reverse(self::TABLES) as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropColumn('tenant_id');
            });
        }

        Schema::dropIfExists('tenants');
    }
};
