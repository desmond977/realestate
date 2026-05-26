<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            if (!Schema::hasColumn('properties', 'property_count')) {
                $table->unsignedInteger('property_count')->default(1)->after('price');
            }

            if (!Schema::hasColumn('properties', 'available_count')) {
                $table->unsignedInteger('available_count')->default(1)->after('property_count');
            }

            if (!Schema::hasColumn('properties', 'reserved_count')) {
                $table->unsignedInteger('reserved_count')->default(0)->after('available_count');
            }

            if (!Schema::hasColumn('properties', 'sold_count')) {
                $table->unsignedInteger('sold_count')->default(0)->after('reserved_count');
            }
        });

        if (Schema::hasColumn('allocations', 'property_unit_id')) {
            Schema::table('allocations', function (Blueprint $table) {
                $table->dropConstrainedForeignId('property_unit_id');
            });
        }

        if (Schema::hasColumn('payments', 'property_unit_id')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropConstrainedForeignId('property_unit_id');
            });
        }

        Schema::dropIfExists('property_units');
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn([
                'property_count',
                'available_count',
                'reserved_count',
                'sold_count',
            ]);
        });
    }
};
