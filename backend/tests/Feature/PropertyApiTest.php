<?php

namespace Tests\Feature;

use App\Enums\PropertyStatus;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PropertyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_properties(): void
    {
        $this->getJson('/api/v1/properties')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_list_properties_with_filters(): void
    {
        Sanctum::actingAs(User::factory()->create());

        Property::factory()->create([
            'title' => 'Lekki Phase One Apartment',
            'type' => 'apartment',
            'location' => 'Lekki',
            'status' => PropertyStatus::Available,
        ]);

        Property::factory()->create([
            'title' => 'Abuja Duplex',
            'type' => 'duplex',
            'location' => 'Gwarinpa',
            'status' => PropertyStatus::Sold,
        ]);

        $response = $this->getJson('/api/v1/properties?status=available&search=Lekki');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Lekki Phase One Apartment')
            ->assertJsonPath('data.0.status', 'available');
    }

    public function test_authenticated_user_can_create_property(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/v1/properties', [
            'title' => 'Greenfield Estate Plot',
            'type' => 'land',
            'location' => 'Ibeju-Lekki',
            'price' => 12500000,
            'status' => 'available',
            'description' => 'Dry land in a fast developing estate.',
            'image' => 'properties/greenfield.jpg',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Property created successfully.')
            ->assertJsonPath('data.property.title', 'Greenfield Estate Plot')
            ->assertJsonPath('data.property.price', 12500000);

        $this->assertDatabaseHas('properties', [
            'title' => 'Greenfield Estate Plot',
            'status' => 'available',
        ]);
    }

    public function test_create_property_requires_valid_payload(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/v1/properties', [
            'title' => '',
            'price' => -1,
            'status' => 'unlisted',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'type', 'location', 'price', 'status']);
    }

    public function test_authenticated_user_can_show_and_update_property(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create([
            'title' => 'Old Title',
            'status' => PropertyStatus::Reserved,
        ]);

        $this->getJson("/api/v1/properties/{$property->id}")
            ->assertOk()
            ->assertJsonPath('data.property.title', 'Old Title');

        $this->patchJson("/api/v1/properties/{$property->id}", [
            'title' => 'Updated Title',
            'status' => 'sold',
        ])->assertOk()
            ->assertJsonPath('message', 'Property updated successfully.')
            ->assertJsonPath('data.property.title', 'Updated Title')
            ->assertJsonPath('data.property.status', 'sold');
    }

    public function test_authenticated_user_can_delete_property(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create();

        $this->deleteJson("/api/v1/properties/{$property->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Property deleted successfully.');

        $this->assertSoftDeleted('properties', [
            'id' => $property->id,
        ]);
    }
}
