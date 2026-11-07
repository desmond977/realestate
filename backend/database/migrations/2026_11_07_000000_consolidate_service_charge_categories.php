<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $tenantIds = DB::table('service_charge_categories')
            ->distinct()
            ->pluck('tenant_id')
            ->filter()
            ->all();

        foreach ($tenantIds as $tenantId) {
            $categories = DB::table('service_charge_categories')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->get();
            $monthlyAmount = (float) $categories
                ->where('is_active', true)
                ->sum(fn ($category) => (float) ($category->monthly_amount ?? 0));
            $monthlyAmount = $monthlyAmount > 0 ? $monthlyAmount : 45000;
            $now = now();

            $categoryId = DB::table('service_charge_categories')
                ->where('tenant_id', $tenantId)
                ->where('name', 'Service Charge')
                ->value('id');

            if ($categoryId) {
                DB::table('service_charge_categories')
                    ->where('id', $categoryId)
                    ->update([
                        'description' => 'Monthly service charge.',
                        'is_system' => false,
                        'monthly_amount' => $monthlyAmount,
                        'is_active' => true,
                        'deleted_at' => null,
                        'updated_at' => $now,
                    ]);
            } else {
                $categoryId = DB::table('service_charge_categories')->insertGetId([
                    'tenant_id' => $tenantId,
                    'name' => 'Service Charge',
                    'description' => 'Monthly service charge.',
                    'is_system' => false,
                    'monthly_amount' => $monthlyAmount,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('service_charge_categories')
                ->where('tenant_id', $tenantId)
                ->where('id', '!=', $categoryId)
                ->whereNull('deleted_at')
                ->update(['deleted_at' => $now, 'updated_at' => $now]);
        }
    }

    public function down(): void
    {
        // Historical category names remain soft-deleted to preserve linked charge history.
    }
};