<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_agreements', function (Blueprint $table) {
            $table->decimal('monthly_service_charge_amount', 15, 2)->nullable()->after('rental_amount');
        });

        Schema::table('service_charges', function (Blueprint $table) {
            $table->char('billing_month', 7)->nullable()->after('billing_period_end');
            $table->index(['tenant_id', 'billing_month'], 'sc_tenant_month_idx');
        });

        // Legacy charges remain intact. Only charges created through the monthly process
        // receive a billing_month and participate in its uniqueness constraint.
        Schema::table('service_charges', function (Blueprint $table) {
            $table->unique(['tenant_id', 'rental_property_id', 'client_id', 'billing_month'], 'sc_monthly_property_month_unique');
        });
    }

    public function down(): void
    {
        Schema::table('service_charges', function (Blueprint $table) {
            $table->dropUnique('sc_monthly_property_month_unique');
            $table->dropIndex('sc_tenant_month_idx');
            $table->dropColumn('billing_month');
        });
        Schema::table('rental_agreements', function (Blueprint $table) {
            $table->dropColumn('monthly_service_charge_amount');
        });
    }
};
