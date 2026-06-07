<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserThemePreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_theme_preference_persists_after_login(): void
    {
        $user = User::factory()->create(['theme_mode' => 'dark']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'theme_mode' => 'dark',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response
            ->assertOk()
            ->assertJsonPath('data.user.theme_mode', 'dark');
    }

    public function test_staff_can_update_theme_preference(): void
    {
        $staff = User::factory()->create(['role' => 'staff', 'theme_mode' => 'system']);

        Sanctum::actingAs($staff);

        $response = $this->patchJson('/api/v1/auth/me/theme', [
            'theme_mode' => 'light',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.user.theme_mode', 'light');

        $this->assertDatabaseHas('users', [
            'id' => $staff->id,
            'theme_mode' => 'light',
        ]);
    }

    public function test_admin_can_update_theme_preference(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'theme_mode' => 'system']);

        Sanctum::actingAs($admin);

        $response = $this->patchJson('/api/v1/auth/me/theme', [
            'theme_mode' => 'dark',
        ]);

        $response->assertOk()->assertJsonPath('data.user.theme_mode', 'dark');
    }

    public function test_accountant_can_update_theme_preference(): void
    {
        $accountant = User::factory()->create(['role' => 'accountant', 'theme_mode' => 'system']);

        Sanctum::actingAs($accountant);

        $response = $this->patchJson('/api/v1/auth/me/theme', [
            'theme_mode' => 'light',
        ]);

        $response->assertOk()->assertJsonPath('data.user.theme_mode', 'light');
    }

    public function test_client_theme_preference_persists_after_login(): void
    {
        $client = Client::factory()->create(['theme_mode' => 'dark']);

        Sanctum::actingAs($client);

        $response = $this->getJson('/api/v1/client/profile');

        $response
            ->assertOk()
            ->assertJsonPath('theme_mode', 'dark');
    }

    public function test_client_can_update_theme_preference(): void
    {
        $client = Client::factory()->create(['theme_mode' => 'system']);

        Sanctum::actingAs($client);

        $response = $this->patchJson('/api/v1/client/profile/theme', [
            'theme_mode' => 'light',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.theme_mode', 'light');

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'theme_mode' => 'light',
        ]);
    }

    public function test_different_users_have_independent_theme_preferences(): void
    {
        $user1 = User::factory()->create(['theme_mode' => 'light']);
        $user2 = User::factory()->create(['theme_mode' => 'dark']);

        Sanctum::actingAs($user1);
        $this->patchJson('/api/v1/auth/me/theme', ['theme_mode' => 'dark'])->assertOk();

        Sanctum::actingAs($user2);
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.user.theme_mode', 'dark');

        Sanctum::actingAs($user1);
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.user.theme_mode', 'dark');

        $user3 = User::factory()->create();
        Sanctum::actingAs($user3);
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk()->assertJsonPath('data.user.theme_mode', 'system');
    }

    public function test_client_theme_preference_is_independent_from_user_theme(): void
    {
        $user = User::factory()->create(['theme_mode' => 'light']);
        $client = Client::factory()->create(['theme_mode' => 'dark']);

        Sanctum::actingAs($user);
        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.user.theme_mode', 'light');

        Sanctum::actingAs($client);
        $this->getJson('/api/v1/client/profile')->assertJsonPath('theme_mode', 'dark');

        Sanctum::actingAs($user);
        $this->patchJson('/api/v1/auth/me/theme', ['theme_mode' => 'dark'])->assertOk();

        Sanctum::actingAs($client);
        $this->getJson('/api/v1/client/profile')->assertJsonPath('theme_mode', 'dark');
    }
}