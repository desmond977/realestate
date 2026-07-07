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
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AllocationPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    private function fakeScreenshot(): UploadedFile
    {
        return UploadedFile::fake()->create('screenshot.jpg', 100, 'image/jpeg');
    }

    private function postAllocation(array $data)
    {
        return $this->withHeaders(['Accept' => 'application/json'])->post('/api/v1/allocations', $data);
    }

    private function patchAllocation(string $id, array $data)
    {
        return $this->withHeaders(['Accept' => 'application/json'])->patch("/api/v1/allocations/{$id}", $data);
    }

    public function test_guest_cannot_access_allocations_or_payments(): void
    {
        $this->getJson('/api/v1/allocations')->assertUnauthorized();
        $this->getJson('/api/v1/payments')->assertUnauthorized();
    }

    public function test_staff_can_load_allocation_form_options_without_property_page_access(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        Client::factory()->create();
        Realtor::factory()->create(['status' => 'active']);
        Property::factory()->create([
            'status' => PropertyStatus::Available,
            'available_count' => 1,
        ]);
        Property::factory()->create([
            'status' => PropertyStatus::Reserved,
            'available_count' => 1,
        ]);
        Property::factory()->create([
            'status' => PropertyStatus::Sold,
            'available_count' => 1,
        ]);

        $this->getJson('/api/v1/allocations/form-options')
            ->assertOk()
            ->assertJsonCount(1, 'data.clients')
            ->assertJsonCount(2, 'data.properties')
            ->assertJsonCount(1, 'data.realtors');

        $this->getJson('/api/v1/properties')->assertForbidden();
    }

    public function test_authenticated_user_can_create_installment_allocation_with_initial_payment_and_receipt(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
            'property_count' => 5,
            'available_count' => 5,
            'reserved_count' => 0,
            'sold_count' => 0,
        ]);
        $realtor = Realtor::factory()->create(['full_name' => 'Central Agent']);
        $client = Client::factory()->create(['realtor_id' => $realtor->id]);

        $response = $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '3_months',
            'initial_payment_amount' => 2500000,
            'payment_method' => 'bank_transfer',
            'payment_screenshot' => $this->fakeScreenshot(),
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('message', 'Allocation created successfully.')
            ->assertJsonPath('data.allocation.amount_paid', 2500000)
            ->assertJsonPath('data.allocation.realtor_id', $realtor->id)
            ->assertJsonPath('data.allocation.realtor.full_name', 'Central Agent')
            ->assertJsonPath('data.allocation.payment_duration', '3_months')
            ->assertJsonPath('data.allocation.payment_duration_label', '3 Months')
            ->assertJsonPath('data.allocation.payment_duration_interval.value', 3)
            ->assertJsonPath('data.allocation.payment_duration_interval.unit', 'months')
            ->assertJsonPath('data.allocation.balance', 7500000)
            ->assertJsonPath('data.allocation.status', 'active')
            ->assertJsonPath('data.allocation.property.status', 'reserved')
            ->assertJsonPath('data.allocation.property.available_count', 4)
            ->assertJsonPath('data.allocation.property.reserved_count', 1)
            ->assertJsonPath('data.allocation.payments.0.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000001')
            ->assertJsonPath('data.allocation.payments.0.receipt.metadata.allocation_id', 1)
            ->assertJsonPath('data.allocation.payments.0.receipt.metadata.client_id', $client->id)
            ->assertJsonPath('data.allocation.payments.0.receipt.metadata.realtor_id', $realtor->id)
            ->assertJsonPath('data.allocation.payments.0.receipt.metadata.property_id', $property->id)
            ->assertJsonCount(1, 'data.allocation.payments');

        $this->assertDatabaseHas('payments', [
            'amount' => 2500000,
            'realtor_id' => $realtor->id,
            'transaction_reference' => null,
            'notes' => null,
        ]);

        $this->assertDatabaseHas('allocations', [
            'client_id' => $client->id,
            'payment_duration' => '3_months',
            'custom_duration_value' => null,
            'custom_duration_unit' => null,
        ]);
        $this->assertNotNull(Allocation::query()->where('client_id', $client->id)->first()?->payment_screenshot);

        $this->assertDatabaseCount('receipts', 1);
    }

    public function test_allocation_payment_duration_is_required_and_custom_duration_is_structured(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
        ]);
        $client = Client::factory()->create();

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_screenshot' => $this->fakeScreenshot(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_duration']);

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => 'custom',
            'custom_duration_value' => 0,
            'custom_duration_unit' => 'fortnights',
            'payment_screenshot' => $this->fakeScreenshot(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['custom_duration_value', 'custom_duration_unit']);
    }

    public function test_full_payment_allocation_requires_full_initial_payment(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
        ]);
        $client = Client::factory()->create();

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'full',
            'payment_duration' => 'one_time',
            'initial_payment_amount' => 5000000,
            'payment_screenshot' => $this->fakeScreenshot(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['initial_payment_amount']);
    }

    public function test_payment_screenshot_is_required_when_creating_allocation_with_payment(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
        ]);
        $client = Client::factory()->create();

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '1_month',
            'payment_status' => 'part_payment',
            'initial_payment_amount' => 1000000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['payment_screenshot']);
    }

    public function test_allocation_can_link_selected_realtor_to_client_and_payment(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
        ]);
        $client = Client::factory()->create(['realtor_id' => null]);
        $realtor = Realtor::factory()->create(['full_name' => 'Allocation Realtor']);

        $response = $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'realtor_id' => $realtor->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '1_month',
            'initial_payment_amount' => 1000000,
            'payment_screenshot' => $this->fakeScreenshot(),
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

    public function test_duplicate_active_allocation_for_same_client_and_property_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
            'available_count' => 2,
            'reserved_count' => 0,
        ]);
        $client = Client::factory()->create();

        $payload = [
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '1_month',
            'payment_status' => 'unpaid',
        ];

        $this->postAllocation($payload)->assertCreated();

        $this->postAllocation($payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_id', 'property_id']);

        $this->assertDatabaseCount('allocations', 1);

        $property->refresh();
        $this->assertSame(1, $property->available_count);
        $this->assertSame(1, $property->reserved_count);
    }

    public function test_cancelled_allocation_does_not_block_reallocating_same_client_and_property(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
            'available_count' => 1,
            'reserved_count' => 0,
        ]);
        $client = Client::factory()->create();

        Allocation::factory()->create([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'amount_paid' => 0,
            'balance' => 10000000,
            'status' => AllocationStatus::Cancelled,
        ]);

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '1_month',
            'payment_status' => 'unpaid',
        ])->assertCreated();

        $this->assertDatabaseCount('allocations', 2);
    }

    public function test_property_with_no_available_count_cannot_be_allocated(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
            'property_count' => 3,
            'available_count' => 0,
            'reserved_count' => 2,
            'sold_count' => 1,
        ]);
        $client = Client::factory()->create();

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '1_month',
            'payment_screenshot' => $this->fakeScreenshot(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['property_id']);
    }

    public function test_sold_property_cannot_be_allocated_even_with_available_count(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create([
            'status' => PropertyStatus::Sold,
            'price' => 10000000,
            'property_count' => 3,
            'available_count' => 1,
            'reserved_count' => 0,
            'sold_count' => 2,
        ]);
        $client = Client::factory()->create();

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '2_months',
            'payment_status' => 'unpaid',
            'payment_screenshot' => $this->fakeScreenshot(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['property_id']);
    }

    public function test_allocation_amount_must_match_property_price(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 12500000,
        ]);
        $client = Client::factory()->create();

        $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '2_months',
            'payment_status' => 'unpaid',
            'payment_screenshot' => $this->fakeScreenshot(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['total_amount']);
    }

    public function test_unpaid_allocation_reserves_inventory_without_payment_or_receipt(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
            'property_count' => 2,
            'available_count' => 2,
            'reserved_count' => 0,
            'sold_count' => 0,
        ]);
        $client = Client::factory()->create();

        $response = $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => 'custom',
            'custom_duration_value' => 10,
            'custom_duration_unit' => 'weeks',
            'payment_status' => 'unpaid',
            'initial_payment_amount' => 500000,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.allocation.status', 'reserved')
            ->assertJsonPath('data.allocation.amount_paid', 0)
            ->assertJsonPath('data.allocation.payment_duration', 'custom')
            ->assertJsonPath('data.allocation.custom_duration_value', 10)
            ->assertJsonPath('data.allocation.custom_duration_unit', 'weeks')
            ->assertJsonPath('data.allocation.payment_duration_interval.value', 10)
            ->assertJsonPath('data.allocation.payment_duration_interval.unit', 'weeks')
            ->assertJsonPath('data.allocation.balance', 10000000)
            ->assertJsonPath('data.allocation.property.available_count', 1)
            ->assertJsonPath('data.allocation.property.reserved_count', 1)
            ->assertJsonCount(0, 'data.allocation.payments');

        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('receipts', 0);
    }

    public function test_paid_allocation_sells_inventory_and_generates_receipt_on_create(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
            'property_count' => 2,
            'available_count' => 2,
            'reserved_count' => 0,
            'sold_count' => 0,
        ]);
        $client = Client::factory()->create();

        $response = $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '6_months',
            'payment_status' => 'paid',
            'payment_screenshot' => $this->fakeScreenshot(),
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.allocation.status', 'completed')
            ->assertJsonPath('data.allocation.amount_paid', 10000000)
            ->assertJsonPath('data.allocation.balance', 0)
            ->assertJsonPath('data.allocation.property.available_count', 1)
            ->assertJsonPath('data.allocation.property.reserved_count', 0)
            ->assertJsonPath('data.allocation.property.sold_count', 1)
            ->assertJsonPath('data.allocation.payments.0.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000001')
            ->assertJsonCount(1, 'data.allocation.payments');

        $this->assertDatabaseCount('receipts', 1);
    }

    public function test_unpaid_allocation_can_be_updated_with_part_payment(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Reserved,
            'price' => 10000000,
            'property_count' => 2,
            'available_count' => 1,
            'reserved_count' => 1,
            'sold_count' => 0,
        ]);
        $client = Client::factory()->create();
        $allocation = Allocation::factory()->create([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'amount_paid' => 0,
            'balance' => 10000000,
            'status' => AllocationStatus::Reserved,
        ]);

        $response = $this->patchAllocation($allocation->id, [
            'payment_duration' => 'custom',
            'custom_duration_value' => 18,
            'custom_duration_unit' => 'months',
            'payment_status' => 'part_payment',
            'initial_payment_amount' => 2500000,
            'payment_method' => 'bank_transfer',
            'notes' => 'Buyer requested installment plan.',
            'payment_screenshot' => $this->fakeScreenshot(),
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Allocation updated successfully.')
            ->assertJsonPath('data.allocation.status', 'active')
            ->assertJsonPath('data.allocation.payment_duration', 'custom')
            ->assertJsonPath('data.allocation.custom_duration_value', 18)
            ->assertJsonPath('data.allocation.custom_duration_unit', 'months')
            ->assertJsonPath('data.allocation.amount_paid', 2500000)
            ->assertJsonPath('data.allocation.balance', 7500000)
            ->assertJsonPath('data.allocation.notes', 'Buyer requested installment plan.')
            ->assertJsonPath('data.allocation.property.status', 'reserved')
            ->assertJsonPath('data.allocation.property.reserved_count', 1)
            ->assertJsonPath('data.allocation.property.sold_count', 0)
            ->assertJsonPath('data.allocation.payments.0.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000001')
            ->assertJsonCount(1, 'data.allocation.payments');

        $this->assertDatabaseHas('payments', [
            'allocation_id' => $allocation->id,
            'amount' => 2500000,
            'notes' => null,
        ]);
    }

    public function test_unpaid_allocation_can_be_updated_to_paid_and_sold(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Reserved,
            'price' => 10000000,
            'property_count' => 1,
            'available_count' => 0,
            'reserved_count' => 1,
            'sold_count' => 0,
        ]);
        $client = Client::factory()->create();
        $allocation = Allocation::factory()->create([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'amount_paid' => 0,
            'balance' => 10000000,
            'status' => AllocationStatus::Reserved,
        ]);

        $response = $this->patchAllocation($allocation->id, [
            'payment_status' => 'paid',
            'initial_payment_amount' => 10000000,
            'payment_method' => 'pos',
            'payment_screenshot' => $this->fakeScreenshot(),
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.allocation.status', 'completed')
            ->assertJsonPath('data.allocation.amount_paid', 10000000)
            ->assertJsonPath('data.allocation.balance', 0)
            ->assertJsonPath('data.allocation.property.status', 'sold')
            ->assertJsonPath('data.allocation.property.reserved_count', 0)
            ->assertJsonPath('data.allocation.property.sold_count', 1)
            ->assertJsonPath('data.allocation.payments.0.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000001');
    }

    public function test_property_with_zero_available_count_stays_available_until_all_plots_are_sold(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Reserved,
            'price' => 10000000,
            'property_count' => 2,
            'available_count' => 0,
            'reserved_count' => 1,
            'sold_count' => 0,
        ]);
        $client = Client::factory()->create();
        $allocation = Allocation::factory()->create([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'amount_paid' => 0,
            'balance' => 10000000,
            'status' => AllocationStatus::Reserved,
        ]);

        $this->patchAllocation($allocation->id, [
            'payment_status' => 'paid',
            'initial_payment_amount' => 10000000,
            'payment_method' => 'pos',
            'payment_screenshot' => $this->fakeScreenshot(),
        ])->assertOk()
            ->assertJsonPath('data.allocation.property.status', 'available')
            ->assertJsonPath('data.allocation.property.available_count', 0)
            ->assertJsonPath('data.allocation.property.reserved_count', 0)
            ->assertJsonPath('data.allocation.property.sold_count', 1);
    }

    public function test_authenticated_user_can_record_payment_and_complete_allocation(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Reserved,
            'price' => 10000000,
            'property_count' => 1,
            'available_count' => 0,
            'reserved_count' => 1,
            'sold_count' => 0,
        ]);
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
        $this->assertSame(0, $property->reserved_count);
        $this->assertSame(1, $property->sold_count);
    }

    public function test_allocation_moves_one_available_plot_to_reserved_and_marks_property_reserved(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $property = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'price' => 10000000,
            'property_count' => 4,
            'available_count' => 4,
            'reserved_count' => 0,
            'sold_count' => 0,
        ]);
        $client = Client::factory()->create();

        $response = $this->postAllocation([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => 10000000,
            'payment_plan' => 'installment',
            'payment_duration' => '1_week',
            'payment_screenshot' => $this->fakeScreenshot(),
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.allocation.status', 'reserved')
            ->assertJsonPath('data.allocation.property.status', 'reserved')
            ->assertJsonPath('data.allocation.property.available_count', 3)
            ->assertJsonPath('data.allocation.property.reserved_count', 1);

        $property->refresh();

        $this->assertSame('reserved', $property->status->value);
        $this->assertSame(3, $property->available_count);
        $this->assertSame(1, $property->reserved_count);
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

    public function test_unpaid_allocation_can_be_cancelled_and_releases_inventory_status(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $property = Property::factory()->create([
            'status' => PropertyStatus::Reserved,
            'property_count' => 2,
            'available_count' => 1,
            'reserved_count' => 1,
            'sold_count' => 0,
        ]);
        $allocation = Allocation::factory()->create([
            'property_id' => $property->id,
            'amount_paid' => 0,
            'balance' => 10000000,
        ]);

        $this->deleteJson("/api/v1/allocations/{$allocation->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Allocation cancelled successfully.')
            ->assertJsonPath('data.allocation.status', 'cancelled')
            ->assertJsonPath('data.allocation.property.status', 'available')
            ->assertJsonPath('data.allocation.property.available_count', 2)
            ->assertJsonPath('data.allocation.property.reserved_count', 0);
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
