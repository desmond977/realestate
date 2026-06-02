<?php

namespace Tests\Feature;

use App\Models\CompanySetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanySettingApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_read_company_settings(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        CompanySetting::query()->create([
            'company_name' => 'Prime Estates',
            'target_type' => 'monthly',
            'target_amount' => 5000000,
        ]);

        $this->getJson('/api/v1/settings/company')
            ->assertOk()
            ->assertJsonPath('data.settings.company_name', 'Prime Estates')
            ->assertJsonPath('data.settings.target_amount', 5000000)
            ->assertJsonPath('data.settings.theme_mode', 'system')
            ->assertJsonPath('data.settings.brand_color', '#166534');
    }

    public function test_only_admin_can_update_company_settings(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->putJson('/api/v1/settings/company', [
            'company_name' => 'Blocked Update',
            'target_type' => 'monthly',
            'target_amount' => 5000000,
        ])->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->putJson('/api/v1/settings/company', [
            'company_name' => 'Prime Estates',
            'company_email' => 'hello@example.com',
            'company_phone' => '08030000000',
            'company_address' => 'Lagos',
            'company_logo' => null,
            'target_type' => 'weekly',
            'target_amount' => 750000,
            'theme_mode' => 'dark',
            'brand_color' => '#0d6efd',
        ])->assertOk()
            ->assertJsonPath('message', 'Company settings updated successfully.')
            ->assertJsonPath('data.settings.company_name', 'Prime Estates')
            ->assertJsonPath('data.settings.target_type', 'weekly')
            ->assertJsonPath('data.settings.theme_mode', 'dark')
            ->assertJsonPath('data.settings.brand_color', '#0d6efd');
    }
}
