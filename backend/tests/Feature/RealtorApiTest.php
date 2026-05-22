<?php

namespace Tests\Feature;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Realtor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RealtorApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_realtors(): void
    {
        $this->getJson('/api/v1/realtors')->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_list_update_and_delete_realtor(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $response = $this->postJson('/api/v1/realtors', [
            'full_name' => 'Solomon Agent',
            'phone' => '08030000000',
            'email' => 'solomon@example.com',
            'address' => 'Abuja',
            'company_name' => 'Terra Agents',
            'status' => 'active',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.realtor.full_name', 'Solomon Agent')
            ->assertJsonPath('data.realtor.status', 'active');

        $realtorId = $response->json('data.realtor.id');

        $this->getJson('/api/v1/realtors?search=Solomon')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Solomon Agent');

        $this->patchJson("/api/v1/realtors/{$realtorId}", [
            'full_name' => 'Solomon Updated',
            'status' => 'inactive',
        ])->assertOk()
            ->assertJsonPath('data.realtor.full_name', 'Solomon Updated')
            ->assertJsonPath('data.realtor.status', 'inactive');

        $this->deleteJson("/api/v1/realtors/{$realtorId}")
            ->assertOk()
            ->assertJsonPath('message', 'Realtor deleted successfully.');

        $this->assertSoftDeleted('realtors', [
            'id' => $realtorId,
        ]);
    }

    public function test_authenticated_user_can_fetch_realtor_analytics(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $realtor = Realtor::factory()->create(['full_name' => 'Prime Agent']);
        $client = Client::factory()->create([
            'realtor_id' => $realtor->id,
        ]);
        $property = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
            'realtor_id' => $realtor->id,
            'total_amount' => 10000000,
            'amount_paid' => 6000000,
            'balance' => 4000000,
            'payment_plan' => PaymentPlan::Installment,
            'status' => AllocationStatus::Active,
        ]);

        Payment::factory()->create([
            'allocation_id' => $allocation->id,
            'client_id' => $client->id,
            'property_id' => $property->id,
            'realtor_id' => $realtor->id,
            'amount' => 6000000,
            'status' => PaymentStatus::Confirmed,
        ]);

        $this->getJson("/api/v1/realtors/{$realtor->id}/analytics")
            ->assertOk()
            ->assertJsonPath('data.realtor.full_name', 'Prime Agent')
            ->assertJsonPath('data.summary.total_clients', 1)
            ->assertJsonPath('data.summary.total_revenue', 6000000)
            ->assertJsonPath('data.summary.outstanding_balances', 4000000)
            ->assertJsonPath('data.connected_clients.0.full_name', $client->full_name)
            ->assertJsonPath('data.connected_clients.0.property', $property->title)
            ->assertJsonPath('data.properties.0.title', $property->title)
            ->assertJsonPath('data.properties.0.payment_progress', 60);
    }
}
