<?php

namespace Tests\Feature;

use App\Enums\PropertyStatus;
use App\Models\Property;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));

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

    public function test_authenticated_user_can_create_property_with_count_inventory(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $response = $this->postJson('/api/v1/properties', [
            'title' => 'Greenfield Estate Plot',
            'type' => 'land',
            'location' => 'Ibeju-Lekki',
            'price' => 12500000,
            'property_count' => 20,
            'status' => 'available',
            'description' => 'Dry land in a fast developing estate.',
            'land_size' => '5 Acres',
            'document_type' => 'C of O',
            'image' => 'properties/greenfield.jpg',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Property created successfully.')
            ->assertJsonPath('data.property.title', 'Greenfield Estate Plot')
            ->assertJsonPath('data.property.price', 12500000)
            ->assertJsonPath('data.property.property_count', 20)
            ->assertJsonPath('data.property.available_count', 20)
            ->assertJsonPath('data.property.reserved_count', 0)
            ->assertJsonPath('data.property.sold_count', 0)
            ->assertJsonPath('data.property.land_size', '5 Acres')
            ->assertJsonPath('data.property.document_type', 'C of O');

        $this->assertDatabaseHas('properties', [
            'title' => 'Greenfield Estate Plot',
            'property_count' => 20,
            'available_count' => 20,
            'status' => 'available',
        ]);
    }

    public function test_create_property_requires_valid_payload(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson('/api/v1/properties', [
            'title' => '',
            'price' => -1,
            'property_count' => 0,
            'status' => 'unlisted',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'type', 'location', 'price', 'property_count', 'status']);
    }

    public function test_property_counts_cannot_exceed_total_count(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->postJson('/api/v1/properties', [
            'title' => 'Invalid Count Estate',
            'type' => 'land',
            'location' => 'Guzape',
            'price' => 10000000,
            'property_count' => 5,
            'available_count' => 4,
            'reserved_count' => 2,
            'sold_count' => 0,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['property_count']);
    }

    public function test_authenticated_user_can_upload_property_image(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        Storage::fake('public');

        $file = UploadedFile::fake()->create('property.jpg', 100, 'image/jpeg');

        $response = $this->post('/api/v1/properties', [
            'title' => 'Upload Plot',
            'type' => 'land',
            'location' => 'Victoria Island',
            'price' => 8000000,
            'property_count' => 8,
            'status' => 'available',
            'description' => 'Image upload test.',
            'land_size' => '1 Plot',
            'document_type' => 'Survey Plan',
            'image' => $file,
        ]);

        $response->assertCreated();
        $this->assertNotNull($response->json('data.property.image'));
        Storage::disk('public')->assertExists($response->json('data.property.image'));
    }

    public function test_authenticated_user_can_show_and_update_property(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $property = Property::factory()->create([
            'title' => 'Old Title',
            'status' => PropertyStatus::Reserved,
            'property_count' => 10,
            'available_count' => 7,
            'reserved_count' => 2,
            'sold_count' => 1,
        ]);

        $this->getJson("/api/v1/properties/{$property->id}")
            ->assertOk()
            ->assertJsonPath('data.property.title', 'Old Title')
            ->assertJsonPath('data.property.available_count', 7);

        $this->patchJson("/api/v1/properties/{$property->id}", [
            'title' => 'Updated Title',
            'status' => 'sold',
            'property_count' => 12,
        ])->assertOk()
            ->assertJsonPath('message', 'Property updated successfully.')
            ->assertJsonPath('data.property.title', 'Updated Title')
            ->assertJsonPath('data.property.status', 'sold')
            ->assertJsonPath('data.property.property_count', 12)
            ->assertJsonPath('data.property.available_count', 9);
    }

    public function test_authenticated_user_can_delete_property(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $property = Property::factory()->create();

        $this->deleteJson("/api/v1/properties/{$property->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Property deleted successfully.');

        $this->assertSoftDeleted('properties', [
            'id' => $property->id,
        ]);
    }

    public function test_staff_cannot_access_property_routes(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $property = Property::factory()->create();

        $this->getJson('/api/v1/properties')->assertForbidden();
        $this->getJson("/api/v1/properties/{$property->id}")->assertForbidden();
        $this->postJson('/api/v1/properties', [
            'title' => 'Blocked Estate',
            'type' => 'land',
            'location' => 'Lekki',
            'price' => 1000000,
            'property_count' => 1,
        ])->assertForbidden();
        $this->patchJson("/api/v1/properties/{$property->id}", [
            'title' => 'Blocked Update',
        ])->assertForbidden();
        $this->deleteJson("/api/v1/properties/{$property->id}")->assertForbidden();
    }

    public function test_accountant_can_view_but_cannot_manage_properties(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create();

        $this->getJson('/api/v1/properties')->assertOk();
        $this->getJson("/api/v1/properties/{$property->id}")->assertOk();
        $this->postJson('/api/v1/properties', [
            'title' => 'Blocked Estate',
            'type' => 'land',
            'location' => 'Lekki',
            'price' => 1000000,
            'property_count' => 1,
        ])->assertForbidden();
        $this->patchJson("/api/v1/properties/{$property->id}", [
            'title' => 'Blocked Update',
        ])->assertForbidden();
        $this->deleteJson("/api/v1/properties/{$property->id}")->assertForbidden();
    }
}
