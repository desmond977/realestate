<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_clients(): void
    {
        $this->getJson('/api/v1/clients')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_list_clients_with_search(): void
    {
        Sanctum::actingAs(User::factory()->create());

        Client::factory()->create([
            'first_name' => 'Ada',
            'last_name' => 'Okafor',
            'email' => 'ada@example.com',
            'phone' => '08030000001',
        ]);

        Client::factory()->create([
            'first_name' => 'Tunde',
            'last_name' => 'Bello',
            'email' => 'tunde@example.com',
            'phone' => '08030000002',
        ]);

        $response = $this->getJson('/api/v1/clients?search=Okafor');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Ada Okafor')
            ->assertJsonPath('data.0.email', 'ada@example.com');
    }

    public function test_authenticated_user_can_create_client(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $response = $this->postJson('/api/v1/clients', [
            'first_name' => 'Chioma',
            'last_name' => 'Nwosu',
            'email' => 'chioma@example.com',
            'phone' => '08030000003',
            'address' => '12 Marina Road, Lagos',
            'occupation' => 'Architect',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Client created successfully.')
            ->assertJsonPath('data.client.full_name', 'Chioma Nwosu')
            ->assertJsonPath('data.client.email', 'chioma@example.com');

        $this->assertDatabaseHas('clients', [
            'email' => 'chioma@example.com',
            'phone' => '08030000003',
        ]);
    }

    public function test_create_client_requires_valid_payload(): void
    {
        Sanctum::actingAs(User::factory()->create());
        Client::factory()->create(['email' => 'existing@example.com']);

        $this->postJson('/api/v1/clients', [
            'first_name' => '',
            'last_name' => '',
            'email' => 'existing@example.com',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'last_name', 'email']);
    }

    public function test_authenticated_user_can_show_and_update_client(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $client = Client::factory()->create([
            'first_name' => 'Old',
            'last_name' => 'Name',
            'email' => 'old@example.com',
        ]);

        $this->getJson("/api/v1/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('data.client.full_name', 'Old Name');

        $this->patchJson("/api/v1/clients/{$client->id}", [
            'first_name' => 'New',
            'email' => 'new@example.com',
        ])->assertOk()
            ->assertJsonPath('message', 'Client updated successfully.')
            ->assertJsonPath('data.client.full_name', 'New Name')
            ->assertJsonPath('data.client.email', 'new@example.com');
    }

    public function test_update_client_rejects_duplicate_email_except_current_client(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $client = Client::factory()->create(['email' => 'client@example.com']);
        Client::factory()->create(['email' => 'taken@example.com']);

        $this->patchJson("/api/v1/clients/{$client->id}", [
            'email' => 'client@example.com',
        ])->assertOk();

        $this->patchJson("/api/v1/clients/{$client->id}", [
            'email' => 'taken@example.com',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_delete_client(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $client = Client::factory()->create();

        $this->deleteJson("/api/v1/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Client deleted successfully.');

        $this->assertSoftDeleted('clients', [
            'id' => $client->id,
        ]);
    }
}
