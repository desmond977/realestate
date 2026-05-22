<?php

namespace Tests\Feature;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Property;
use App\Models\Realtor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AllocationPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_allocations_or_payments(): void
    {
        $this->getJson('/api/v1/allocations')->assertUnauthorized();
        $this->getJson('/api/v1/payments')->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_installment_allocation_with_initial_payment_and_receipt(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create(['status' => PropertyStatus::Available]);
        $realtor = Realtor::factory()->create(['full_name' => 'Central Agent']);
        $client = Client::factory()->create(['realtor_id' => $realtor->id]);

        $response = $this->postJson('/api/v1/allocations', [
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'initial_payment_amount' => 2500000,
            'payment_method' => 'bank_transfer',
            'transaction_reference' => 'TXN-INITIAL-001',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Allocation created successfully.')
            ->assertJsonPath('data.allocation.amount_paid', 2500000)
            ->assertJsonPath('data.allocation.realtor_id', $realtor->id)
            ->assertJsonPath('data.allocation.realtor.full_name', 'Central Agent')
            ->assertJsonPath('data.allocation.balance', 7500000)
            ->assertJsonPath('data.allocation.status', 'active')
            ->assertJsonPath('data.allocation.property.status', 'reserved')
            ->assertJsonCount(1, 'data.allocation.payments')
            ->assertJsonPath('data.allocation.payments.0.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000001');

        $this->assertDatabaseHas('payments', [
            'transaction_reference' => 'TXN-INITIAL-001',
            'amount' => 2500000,
            'realtor_id' => $realtor->id,
        ]);

        $this->assertDatabaseHas('receipts', [
            'receipt_number' => 'REC-'.now()->format('Ymd').'-000001',
        ]);
    }

    public function test_full_payment_allocation_requires_full_initial_payment(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create(['status' => PropertyStatus::Available]);
        $client = Client::factory()->create();

        $this->postJson('/api/v1/allocations', [
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'full',
            'initial_payment_amount' => 5000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['initial_payment_amount']);
    }

    public function test_allocation_can_link_selected_realtor_to_client_and_payment(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create(['status' => PropertyStatus::Available]);
        $client = Client::factory()->create(['realtor_id' => null]);
        $realtor = Realtor::factory()->create(['full_name' => 'Allocation Realtor']);

        $response = $this->postJson('/api/v1/allocations', [
            'property_id' => $property->id,
            'client_id' => $client->id,
            'realtor_id' => $realtor->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'initial_payment_amount' => 1000000,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.allocation.realtor_id', $realtor->id)
            ->assertJsonPath('data.allocation.realtor.full_name', 'Allocation Realtor')
            ->assertJsonPath('data.allocation.payments.0.realtor_id', $realtor->id);

        $this->assertDatabaseHas('clients', [
            'id' => $client->id,
            'realtor_id' => $realtor->id,
        ]);
    }

    public function test_reserved_or_sold_property_cannot_be_allocated_again(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $client = Client::factory()->create();

        $this->postJson('/api/v1/allocations', [
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['property_id']);
    }

    public function test_authenticated_user_can_record_payment_and_complete_allocation(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $realtor = Realtor::factory()->create(['full_name' => 'Final Agent']);
        $client = Client::factory()->create(['realtor_id' => $realtor->id]);
        $allocation = Allocation::factory()->create([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'realtor_id' => $realtor->id,
            'total_amount' => 10000000,
            'amount_paid' => 7500000,
            'balance' => 2500000,
            'payment_plan' => PaymentPlan::Installment,
            'status' => AllocationStatus::Active,
        ]);

        $response = $this->postJson('/api/v1/payments', [
            'allocation_id' => $allocation->id,
            'amount' => 2500000,
            'payment_method' => 'pos',
            'transaction_reference' => 'TXN-FINAL-001',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Payment recorded successfully.')
            ->assertJsonPath('data.payment.amount', 2500000)
            ->assertJsonPath('data.payment.realtor_id', $realtor->id)
            ->assertJsonPath('data.payment.realtor.full_name', 'Final Agent')
            ->assertJsonPath('data.payment.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000001');

        $allocation->refresh();
        $property->refresh();

        $this->assertSame('completed', $allocation->status->value);
        $this->assertSame(0.0, (float) $allocation->balance);
        $this->assertSame('sold', $property->status->value);
    }

    public function test_payment_cannot_exceed_outstanding_balance(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $allocation = Allocation::factory()->create([
            'total_amount' => 10000000,
            'amount_paid' => 9000000,
            'balance' => 1000000,
        ]);

        $this->postJson('/api/v1/payments', [
            'allocation_id' => $allocation->id,
            'amount' => 1000001,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);
    }

    public function test_unpaid_allocation_can_be_cancelled_and_property_becomes_available(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $allocation = Allocation::factory()->create([
            'property_id' => $property->id,
            'amount_paid' => 0,
            'balance' => 10000000,
        ]);

        $this->deleteJson("/api/v1/allocations/{$allocation->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Allocation cancelled successfully.')
            ->assertJsonPath('data.allocation.status', 'cancelled')
            ->assertJsonPath('data.allocation.property.status', 'available');
    }

    public function test_paid_allocation_cannot_be_cancelled(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $allocation = Allocation::factory()->create([
            'amount_paid' => 1000000,
            'balance' => 9000000,
        ]);

        $this->deleteJson("/api/v1/allocations/{$allocation->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['allocation_id']);
    }

    public function test_staff_cannot_record_payments(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->postJson('/api/v1/payments', [
            'allocation_id' => 1,
            'amount' => 100000,
        ])->assertForbidden();
    }
}
