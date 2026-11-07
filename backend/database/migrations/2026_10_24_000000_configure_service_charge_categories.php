<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_charge_categories', function (Blueprint $table) {
            $table->decimal('monthly_amount', 15, 2)->nullable()->after('description');
            $table->boolean('is_active')->default(true)->after('is_system');
        });

        $tenantIds = DB::table('service_charge_categories')->distinct()->pluck('tenant_id')->filter()->all() ?: [1];
        foreach ($tenantIds as $tenantId) {
            foreach ([
                'Electricity' => 10000,
                'Security' => 20000,
                'Maintenance' => 5000,
                'Waste Management' => 10000,
            ] as $name => $amount) {
                DB::table('service_charge_categories')->updateOrInsert(
                    ['tenant_id' => $tenantId, 'name' => $name],
                    ['description' => $name.' service charge.', 'monthly_amount' => $amount, 'is_system' => true, 'is_active' => true, 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }

        DB::table('service_charge_categories')
            ->where('name', 'Other')
            ->update(['monthly_amount' => null, 'is_active' => false]);

        Schema::table('service_charges', function (Blueprint $table) {
            $table->dropUnique('sc_monthly_property_month_unique');
            $table->unique(
                ['tenant_id', 'rental_property_id', 'client_id', 'category_id', 'billing_month'],
                'sc_monthly_category_month_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('service_charges', function (Blueprint $table) {
            $table->dropUnique('sc_monthly_category_month_unique');
            $table->unique(
                ['tenant_id', 'rental_property_id', 'client_id', 'billing_month'],
                'sc_monthly_property_month_unique'
            );
        });

        Schema::table('service_charge_categories', function (Blueprint $table) {
            $table->dropColumn(['monthly_amount', 'is_active']);
        });
    }
};
