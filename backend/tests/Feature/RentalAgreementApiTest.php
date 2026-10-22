<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Property;
use App\Models\RentalAgreement;
use App\Models\RentalProperty;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RentalAgreementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_rentals(): void
    {
        $this->getJson('/api/v1/rentals')->assertUnauthorized();
    }

    public function test_authorized_user_can_list_and_filter_rentals(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $client = Client::factory()->create(['first_name' => 'Amina', 'last_name' => 'Okafor']);

        $active = $this->createAgreement($client, [
            'name' => 'Cedar Court Flat 4',
            'location' => 'Lekki',
            'status' => 'active',
        ]);
        $this->createAgreement($client, [
            'name' => 'Hilltop Suite',
            'location' => 'Abuja',
            'status' => 'expired',
        ]);

        $this->getJson('/api/v1/rentals?status=active&search=Amina')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $active->id)
            ->assertJsonPath('data.0.rental_property.name', 'Cedar Court Flat 4')
            ->assertJsonPath('data.0.client.full_name', 'Amina Okafor');
    }

    public function test_admin_can_create_rental_linked_to_a_property_without_changing_sales_inventory(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::factory()->create();
        $property = Property::factory()->create([
            'available_count' => 4,
            'reserved_count' => 2,
            'sold_count' => 1,
            'status' => 'available',
        ]);

        $response = $this->postJson('/api/v1/rentals', [
            'property_id' => $property->id,
            'property_name' => '',
            'property_location' => '',
            'client_id' => $client->id,
            'rental_amount' => 1500,
            'rental_frequency' => 'monthly',
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2027-09-30',
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Rental agreement created successfully.')
            ->assertJsonPath('data.rental.rental_amount', 1500)
            ->assertJsonPath('data.rental.rental_property.property_id', $property->id)
            ->assertJsonPath('data.rental.rental_property.name', null)
            ->assertJsonPath('data.rental.rental_property.property.title', $property->title)
            ->assertJsonPath('data.rental.client.id', $client->id);

        $this->assertDatabaseHas('rental_properties', [
            'property_id' => $property->id,
            'tenant_id' => 1,
        ]);
        $this->assertDatabaseHas('properties', [
            'id' => $property->id,
            'available_count' => 4,
            'reserved_count' => 2,
            'sold_count' => 1,
            'status' => 'available',
        ]);
    }

    public function test_admin_can_create_and_update_a_standalone_rental_property(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::factory()->create();

        $response = $this->postJson('/api/v1/rentals', $this->payload($client, [
            'property_name' => 'Garden Cottage',
            'property_location' => 'Ikeja',
        ]))->assertCreated();

        $rentalId = $response->json('data.rental.id');
        $this->assertDatabaseHas('rental_properties', [
            'name' => 'Garden Cottage',
            'location' => 'Ikeja',
            'property_id' => null,
        ]);

        $this->putJson("/api/v1/rentals/{$rentalId}", $this->payload($client, [
            'property_name' => 'Garden Cottage Annex',
            'property_location' => 'Yaba',
            'rental_amount' => 1750,
        ]))
            ->assertOk()
            ->assertJsonPath('data.rental.rental_property.name', 'Garden Cottage Annex')
            ->assertJsonPath('data.rental.rental_amount', 1750);
    }

    public function test_rental_payload_requires_valid_lease_terms_and_associations(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::factory()->create();

        $this->postJson('/api/v1/rentals', $this->payload($client, [
            'property_name' => '',
            'property_location' => '',
            'rental_amount' => 0,
            'rental_frequency' => 'daily',
            'lease_start_date' => '2027-01-01',
            'lease_end_date' => '2026-12-31',
        ]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'property_name',
                'property_location',
                'rental_amount',
                'rental_frequency',
                'lease_end_date',
            ]);
    }

    public function test_non_admin_cannot_create_update_or_delete_rentals(): void
    {
        $client = Client::factory()->create();
        $rental = $this->createAgreement($client);
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->postJson('/api/v1/rentals', $this->payload($client))->assertForbidden();
        $this->putJson("/api/v1/rentals/{$rental->id}", $this->payload($client))->assertForbidden();
        $this->deleteJson("/api/v1/rentals/{$rental->id}")->assertForbidden();
    }

    public function test_admin_can_soft_delete_a_rental_agreement(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $rental = $this->createAgreement(Client::factory()->create());

        $this->deleteJson("/api/v1/rentals/{$rental->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Rental agreement deleted successfully.');

        $this->assertSoftDeleted('rental_agreements', ['id' => $rental->id]);
        $this->assertSoftDeleted('rental_properties', ['id' => $rental->rental_property_id]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(Client $client, array $overrides = []): array
    {
        return array_replace([
            'property_name' => 'Test Rental Home',
            'property_location' => 'Lagos',
            'client_id' => $client->id,
            'rental_amount' => 1200,
            'rental_frequency' => 'monthly',
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2027-09-30',
            'status' => 'pending',
        ], $overrides);
    }

    /**
     * @param  array<string, mixed>  $propertyOverrides
     */
    private function createAgreement(Client $client, array $propertyOverrides = []): RentalAgreement
    {
        $status = $propertyOverrides['status'] ?? 'pending';
        unset($propertyOverrides['status']);

        $property = RentalProperty::query()->create(array_replace([
            'name' => 'Test Rental Home',
            'location' => 'Lagos',
        ], $propertyOverrides));

        return $property->agreements()->create([
            'client_id' => $client->id,
            'rental_amount' => 1200,
            'rental_frequency' => 'monthly',
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2027-09-30',
            'status' => $status,
        ]);
    }
}
