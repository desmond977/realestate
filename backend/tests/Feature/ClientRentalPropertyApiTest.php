<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Models\Client;
use App\Models\CompanySetting;
use App\Models\Property;
use App\Models\RentalProperty;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientRentalPropertyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_sees_only_their_active_rental_properties(): void
    {
        $client = Client::factory()->create(['first_name' => 'Ada', 'last_name' => 'Tenant']);
        $otherClient = Client::factory()->create();
        $property = Property::factory()->create([
            'title' => 'Garden Residence',
            'location' => 'Ikeja',
            'image' => 'properties/garden-residence.jpg',
        ]);
        $rentalProperty = RentalProperty::query()->create([
            'property_id' => $property->id,
            'name' => 'Garden Residence, Flat 2',
            'location' => 'Ikeja, Lagos',
        ]);
        $activeAgreement = $rentalProperty->agreements()->create([
            'client_id' => $client->id,
            'rental_amount' => 250000,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2026-01-01',
            'lease_end_date' => '2026-12-31',
            'status' => 'active',
        ]);
        $rentalProperty->agreements()->create([
            'client_id' => $client->id,
            'rental_amount' => 200000,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2025-01-01',
            'lease_end_date' => '2025-12-31',
            'status' => 'expired',
        ]);
        $rentalProperty->agreements()->create([
            'client_id' => $otherClient->id,
            'rental_amount' => 300000,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2026-01-01',
            'lease_end_date' => '2026-12-31',
            'status' => 'active',
        ]);
        Property::factory()->create(['title' => 'Vacant Sales Listing']);

        Sanctum::actingAs($client);

        $this->getJson('/api/v1/client/rental-properties')
            ->assertOk()
            ->assertJsonCount(1, 'data.properties')
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.properties.0.rental_id', $activeAgreement->id)
            ->assertJsonPath('data.properties.0.status', 'active')
            ->assertJsonPath('data.properties.0.rental_property.name', 'Garden Residence, Flat 2')
            ->assertJsonPath('data.properties.0.rental_property.property.title', 'Garden Residence')
            ->assertJsonPath('data.properties.0.tenant.full_name', 'Ada Tenant');
    }

    public function test_rental_properties_require_client_authentication_and_enabled_rental_module(): void
    {
        $this->getJson('/api/v1/client/rental-properties')->assertUnauthorized();

        Sanctum::actingAs(Client::factory()->create());
        CompanySetting::query()->create([
            'target_type' => 'monthly',
            'target_amount' => 100000,
            'rental_management_enabled' => false,
        ]);

        $this->getJson('/api/v1/client/rental-properties')->assertForbidden();
    }
}
