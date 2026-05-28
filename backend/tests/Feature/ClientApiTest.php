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
            'realtor_id' => Realtor::factory()->create(['full_name' => 'Agent Ada'])->id,
        ]);

        Client::factory()->create([
            'first_name' => 'Tunde',
            'last_name' => 'Bello',
            'email' => 'tunde@example.com',
            'phone' => '08030000002',
            'realtor_id' => null,
        ]);

        $response = $this->getJson('/api/v1/clients?search=Agent');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.full_name', 'Ada Okafor')
            ->assertJsonPath('data.0.email', 'ada@example.com')
            ->assertJsonPath('data.0.realtor.full_name', 'Agent Ada');
    }

    public function test_authenticated_user_can_create_client(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $realtor = Realtor::factory()->create(['full_name' => 'Grace Realtor']);

        $response = $this->postJson('/api/v1/clients', [
            'first_name' => 'Chioma',
            'last_name' => 'Nwosu',
            'email' => 'chioma@example.com',
            'phone' => '08030000003',
            'address' => '12 Marina Road, Lagos',
            'occupation' => 'Architect',
            'realtor_id' => $realtor->id,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Client created successfully.')
            ->assertJsonPath('data.client.full_name', 'Chioma Nwosu')
            ->assertJsonPath('data.client.email', 'chioma@example.com')
            ->assertJsonPath('data.client.realtor_id', $realtor->id)
            ->assertJsonPath('data.client.realtor.full_name', 'Grace Realtor');

        $this->assertDatabaseHas('clients', [
            'email' => 'chioma@example.com',
            'phone' => '08030000003',
            'realtor_id' => $realtor->id,
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

        $realtor = Realtor::factory()->create(['full_name' => 'Updated Agent']);

        $this->patchJson("/api/v1/clients/{$client->id}", [
            'first_name' => 'New',
            'email' => 'new@example.com',
            'realtor_id' => $realtor->id,
        ])->assertOk()
            ->assertJsonPath('message', 'Client updated successfully.')
            ->assertJsonPath('data.client.full_name', 'New Name')
            ->assertJsonPath('data.client.email', 'new@example.com')
            ->assertJsonPath('data.client.realtor.full_name', 'Updated Agent');
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

    public function test_admin_can_soft_delete_client_without_orphaning_related_records(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::factory()->create();
        $property = Property::factory()->create();
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
        ]);
        $payment = Payment::factory()->create([
            'allocation_id' => $allocation->id,
            'client_id' => $client->id,
            'property_id' => $property->id,
        ]);
        $receipt = Receipt::factory()->create([
            'payment_id' => $payment->id,
        ]);

        $this->deleteJson("/api/v1/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Client deleted successfully.');

        $this->assertSoftDeleted('clients', [
            'id' => $client->id,
        ]);

        $this->assertDatabaseHas('allocations', [
            'id' => $allocation->id,
            'client_id' => $client->id,
        ]);
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'client_id' => $client->id,
        ]);
        $this->assertDatabaseHas('receipts', [
            'id' => $receipt->id,
            'payment_id' => $payment->id,
        ]);

        $this->getJson('/api/v1/clients')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_staff_cannot_delete_clients(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $client = Client::factory()->create();

        $this->deleteJson("/api/v1/clients/{$client->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'deleted_at' => null,
        ]);
    }

    public function test_authenticated_user_can_fetch_client_activity_overview(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $realtor = Realtor::factory()->create(['full_name' => 'Referral Partner']);
        $client = Client::factory()->create(['realtor_id' => $realtor->id]);
        $property = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
            'realtor_id' => $realtor->id,
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
            'realtor_id' => $realtor->id,
            'amount' => 4000000,
            'status' => PaymentStatus::Confirmed,
        ]);

        Receipt::factory()->create([
            'payment_id' => $payment->id,
            'receipt_number' => 'REC-CLIENT-001',
        ]);

        $this->getJson("/api/v1/clients/{$client->id}/activity")
            ->assertOk()
            ->assertJsonPath('data.client.realtor.full_name', 'Referral Partner')
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
