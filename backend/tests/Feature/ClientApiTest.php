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
use App\Models\Receipt;
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
            'referred_by' => 'Agent Ada',
        ]);

        Client::factory()->create([
            'first_name' => 'Tunde',
            'last_name' => 'Bello',
            'email' => 'tunde@example.com',
            'phone' => '08030000002',
            'referred_by' => null,
        ]);

        $response = $this->getJson('/api/v1/clients?search=Agent');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Ada Okafor')
            ->assertJsonPath('data.0.email', 'ada@example.com')
            ->assertJsonPath('data.0.referred_by', 'Agent Ada');
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
            'referred_by' => 'Grace Realtor',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Client created successfully.')
            ->assertJsonPath('data.client.full_name', 'Chioma Nwosu')
            ->assertJsonPath('data.client.email', 'chioma@example.com')
            ->assertJsonPath('data.client.referred_by', 'Grace Realtor');

        $this->assertDatabaseHas('clients', [
            'email' => 'chioma@example.com',
            'phone' => '08030000003',
            'referred_by' => 'Grace Realtor',
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
            'referred_by' => 'Updated Agent',
        ])->assertOk()
            ->assertJsonPath('message', 'Client updated successfully.')
            ->assertJsonPath('data.client.full_name', 'New Name')
            ->assertJsonPath('data.client.email', 'new@example.com')
            ->assertJsonPath('data.client.referred_by', 'Updated Agent');
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

    public function test_authenticated_user_can_fetch_client_activity_overview(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $client = Client::factory()->create(['referred_by' => 'Referral Partner']);
        $property = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
            'total_amount' => 10000000,
            'amount_paid' => 4000000,
            'balance' => 6000000,
            'payment_plan' => PaymentPlan::Installment,
            'status' => AllocationStatus::Active,
        ]);
        $payment = Payment::factory()->create([
            'allocation_id' => $allocation->id,
            'client_id' => $client->id,
            'property_id' => $property->id,
            'amount' => 4000000,
            'status' => PaymentStatus::Confirmed,
        ]);

        Receipt::factory()->create([
            'payment_id' => $payment->id,
            'receipt_number' => 'REC-CLIENT-001',
        ]);

        $this->getJson("/api/v1/clients/{$client->id}/activity")
            ->assertOk()
            ->assertJsonPath('data.client.referred_by', 'Referral Partner')
            ->assertJsonPath('data.summary.allocated_properties', 1)
            ->assertJsonPath('data.summary.total_amount_paid', 4000000)
            ->assertJsonPath('data.summary.outstanding_balance', 6000000)
            ->assertJsonPath('data.properties.0.title', $property->title)
            ->assertJsonPath('data.allocations.0.id', $allocation->id)
            ->assertJsonPath('data.payments.0.id', $payment->id)
            ->assertJsonPath('data.receipts.0.receipt_number', 'REC-CLIENT-001')
            ->assertJsonCount(1, 'data.installments')
            ->assertJsonCount(3, 'data.recent_activities');
    }
}
