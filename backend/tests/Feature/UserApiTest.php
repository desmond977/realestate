<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_can_manage_users(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->getJson('/api/v1/users')
            ->assertForbidden();
    }

    public function test_admin_can_create_update_and_delete_user(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $response = $this->postJson('/api/v1/users', [
            'name' => 'Operations Staff',
            'email' => 'ops@example.com',
            'phone' => '08030000000',
            'password' => 'password123',
            'role' => 'staff',
            'status' => 'active',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.email', 'ops@example.com')
            ->assertJsonPath('data.user.role', 'staff')
            ->assertJsonPath('data.user.status', 'active');

        $userId = $response->json('data.user.id');

        $this->patchJson("/api/v1/users/{$userId}", [
            'role' => 'accountant',
            'status' => 'inactive',
        ])->assertOk()
            ->assertJsonPath('data.user.role', 'accountant')
            ->assertJsonPath('data.user.status', 'inactive');

        $this->deleteJson("/api/v1/users/{$userId}")
            ->assertOk();

        $this->assertDatabaseMissing('users', [
            'id' => $userId,
        ]);
    }
}
