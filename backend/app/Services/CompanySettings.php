<?php

namespace App\Services;

use App\Models\CompanySetting;
use Illuminate\Support\Facades\Cache;

class CompanySettings
{
    private function cacheKey(): string
    {
        return 'company_settings:' . (app(TenantManager::class)->currentId() ?? 'default');
    }

    public function get(): array
    {
        return Cache::rememberForever($this->cacheKey(), function () {
            $settings = CompanySetting::query()->first();

            return [
                'name' => $settings?->company_name ?: 'Company',
                'tagline' => 'Intelligent Real Estate Operations',
                'email' => $settings?->company_email,
                'phone' => $settings?->company_phone,
                'address' => $settings?->company_address,
                'logo' => $settings?->company_logo,
                'target_type' => $settings?->target_type,
                'target_amount' => (float) ($settings?->target_amount ?? 0),
            ];
        });
    }

    public function forget(): void
    {
        Cache::forget($this->cacheKey());
    }
}
