<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RealEstateManagementModuleApiTest extends TestCase
{
    use RefreshDatabase;

    private function updateModules(bool $realEstate, bool $rental): void
    {
        $this->putJson('/api/v1/settings/company', [
            'target_type' => 'monthly',
            'target_amount' => 100000,
            'real_estate_management_enabled' => $realEstate,
            'rental_management_enabled' => $rental,
        ])->assertOk();
    }

    public function test_real_estate_toggle_blocks_core_routes_without_disabling_rental_routes(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->updateModules(false, true);

        $this->getJson('/api/v1/dashboard')->assertForbidden();
        $this->getJson('/api/v1/properties')->assertForbidden();
        $this->getJson('/api/v1/rentals')->assertOk();

        $this->updateModules(true, true);
        $this->getJson('/api/v1/properties')->assertOk();
    }

    public function test_rental_toggle_does_not_disable_real_estate_routes(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->updateModules(true, false);

        $this->getJson('/api/v1/properties')->assertOk();
        $this->getJson('/api/v1/rentals')->assertForbidden();
    }
}
