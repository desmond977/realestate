<?php

namespace Tests\Feature;

use App\Enums\AllocationStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\DocumentTemplate;
use App\Models\GeneratedDocument;
use App\Models\Property;
use App\Models\Realtor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AllocationPromotionalDiscountTest extends TestCase
{
    use RefreshDatabase;

    public function test_percentage_discount_precedes_payment_and_is_visible_in_receipt_documents_portal_and_sales_analytics(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $property = Property::factory()->create([
            'title' => 'Discounted Estate Plot',
            'price' => 5_000_000,
            'property_count' => 2,
            'available_count' => 2,
        ]);
        $realtor = Realtor::factory()->create();
        $client = Client::factory()->create(['realtor_id' => $realtor->id]);

        $response = $this->postJson('/api/v1/allocations', [
            'property_id' => $property->id,
            'client_id' => $client->id,
            'realtor_id' => $realtor->id,
            'total_amount' => 5_000_000,
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'payment_plan' => 'installment',
            'payment_duration' => '3_months',
            'payment_status' => 'part_payment',
            'initial_payment_amount' => 1_000_000,
            'payment_method' => 'bank_transfer',
            'payment_screenshot' => UploadedFile::fake()->create('proof.jpg', 100, 'image/jpeg'),
        ])->assertCreated()
            ->assertJsonPath('data.allocation.original_price', 5_000_000)
            ->assertJsonPath('data.allocation.discount_type', 'percentage')
            ->assertJsonPath('data.allocation.discount_value', 10)
            ->assertJsonPath('data.allocation.discount_amount', 500_000)
            ->assertJsonPath('data.allocation.total_amount', 4_500_000)
            ->assertJsonPath('data.allocation.final_payable_amount', 4_500_000)
            ->assertJsonPath('data.allocation.amount_paid', 1_000_000)
            ->assertJsonPath('data.allocation.balance', 3_500_000)
            ->assertJsonPath('data.allocation.payments.0.amount', 1_000_000);

        $allocationId = $response->json('data.allocation.id');
        $allocation = Allocation::query()->with('payments.receipt')->findOrFail($allocationId);
        $receiptId = $allocation->payments->firstOrFail()->receipt->id;

        $this->getJson("/api/v1/receipts/{$receiptId}/document")
            ->assertOk()
            ->assertJsonPath('data.property.original_price', 5_000_000)
            ->assertJsonPath('data.allocation.discount_type', 'percentage')
            ->assertJsonPath('data.allocation.discount_amount', 500_000)
            ->assertJsonPath('data.allocation.final_payable_amount', 4_500_000);

        $template = DocumentTemplate::query()->create([
            'name' => 'Offer Letter',
            'slug' => 'offer-letter-discount-test',
            'view_path' => 'documents.templates.offer',
            'is_active' => true,
        ]);
        $this->patchJson("/api/v1/allocations/{$allocationId}/documents", [
            'documents' => [$template->id => true],
        ])->assertOk();

        $this->postJson("/api/v1/allocations/{$allocationId}/documents/{$template->id}/generate")
            ->assertCreated()
            ->assertJsonPath('data.document.document_name', 'Offer Letter');
        $generatedDocument = GeneratedDocument::query()->latest('id')->firstOrFail();
        $this->assertSame('5,000,000.00', $generatedDocument->data_snapshot['original_price']);
        $this->assertSame('10.00', $generatedDocument->data_snapshot['discount_value']);
        $this->assertSame('500,000.00', $generatedDocument->data_snapshot['discount_amount']);
        $this->assertSame('4,500,000.00', $generatedDocument->data_snapshot['final_payable_amount']);
        $this->assertStringContainsString('Final Payable Amount', $generatedDocument->content_html);

        $this->getJson('/api/v1/documents')
            ->assertOk()
            ->assertJsonPath('data.allocations.0.original_price', 5_000_000)
            ->assertJsonPath('data.allocations.0.discount_amount', 500_000)
            ->assertJsonPath('data.allocations.0.final_payable_amount', 4_500_000);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.stats.revenue', 1_000_000)
            ->assertJsonPath('data.stats.outstanding_balances', 3_500_000);

        $this->getJson("/api/v1/clients/{$client->id}/activity")
            ->assertOk()
            ->assertJsonPath('data.properties.0.original_price', 5_000_000)
            ->assertJsonPath('data.properties.0.final_payable_amount', 4_500_000)
            ->assertJsonPath('data.installments.0.discount_amount', 500_000);

        Sanctum::actingAs($admin);
        $this->getJson("/api/v1/realtors/{$realtor->id}/analytics")
            ->assertOk()
            ->assertJsonPath('data.properties.0.original_price', 5_000_000)
            ->assertJsonPath('data.properties.0.discount_amount', 500_000)
            ->assertJsonPath('data.properties.0.final_payable_amount', 4_500_000);

        Sanctum::actingAs($client);
        $this->getJson('/api/v1/client/properties')
            ->assertOk()
            ->assertJsonPath('properties.0.original_price', 5_000_000)
            ->assertJsonPath('properties.0.discount_amount', 500_000)
            ->assertJsonPath('properties.0.final_payable_amount', 4_500_000);
    }

    public function test_fixed_discount_is_applied_before_recording_part_payments_and_balance(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $property = Property::factory()->create(['price' => 5_000_000]);
        $client = Client::factory()->create();
        $allocation = $this->createUnpaidAllocation($property, $client, [
            'discount_type' => 'fixed',
            'discount_value' => 250_000,
        ]);

        $this->assertSame(5_000_000.0, (float) $allocation->original_price);
        $this->assertSame(250_000.0, (float) $allocation->discount_amount);
        $this->assertSame(4_750_000.0, (float) $allocation->total_amount);
        $this->assertSame(4_750_000.0, (float) $allocation->balance);

        $this->postJson('/api/v1/payments', [
            'allocation_id' => $allocation->id,
            'amount' => 1_250_000,
            'payment_method' => 'bank_transfer',
        ])->assertCreated();

        $this->assertSame(3_500_000.0, (float) $allocation->fresh()->balance);
        $this->assertSame(1_250_000.0, (float) $allocation->fresh()->amount_paid);
    }

    public function test_admin_can_change_discount_before_payments_but_cannot_change_it_after_a_payment(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $property = Property::factory()->create(['price' => 5_000_000]);
        $client = Client::factory()->create();
        $allocation = $this->createUnpaidAllocation($property, $client);

        $this->patchJson("/api/v1/allocations/{$allocation->id}", [
            'discount_type' => 'fixed',
            'discount_value' => 400_000,
        ])->assertOk()
            ->assertJsonPath('data.allocation.discount_amount', 400_000)
            ->assertJsonPath('data.allocation.final_payable_amount', 4_600_000)
            ->assertJsonPath('data.allocation.balance', 4_600_000);

        $this->postJson('/api/v1/payments', [
            'allocation_id' => $allocation->id,
            'amount' => 1_000_000,
            'payment_method' => 'cash',
        ])->assertCreated();

        $this->patchJson("/api/v1/allocations/{$allocation->id}", [
            'discount_type' => 'percentage',
            'discount_value' => 20,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['discount_type']);

        $this->assertDatabaseHas('allocations', [
            'id' => $allocation->id,
            'original_price' => 5_000_000,
            'discount_type' => 'fixed',
            'discount_amount' => 400_000,
            'total_amount' => 4_600_000,
            'amount_paid' => 1_000_000,
            'balance' => 3_600_000,
        ]);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_discounts_are_admin_only_and_discount_values_cannot_exceed_the_price(): void
    {
        $property = Property::factory()->create(['price' => 5_000_000]);
        $client = Client::factory()->create();
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->postJson('/api/v1/allocations', [
            'property_id' => $property->id,
            'client_id' => $client->id,
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'payment_plan' => 'installment',
            'payment_duration' => 'one_time',
        ])->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $allocation = $this->createUnpaidAllocation($property, $client);
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $this->patchJson("/api/v1/allocations/{$allocation->id}", [
            'discount_type' => 'fixed',
            'discount_value' => 100_000,
        ])->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $validationProperty = Property::factory()->create(['price' => 5_000_000]);
        $validationClient = Client::factory()->create();
        $this->postJson('/api/v1/allocations', [
            'property_id' => $validationProperty->id,
            'client_id' => $validationClient->id,
            'discount_type' => 'percentage',
            'discount_value' => 100.01,
            'payment_plan' => 'installment',
            'payment_duration' => 'one_time',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['discount_value']);

        $this->postJson('/api/v1/allocations', [
            'property_id' => $validationProperty->id,
            'client_id' => $validationClient->id,
            'discount_type' => 'fixed',
            'discount_value' => 5_000_000.01,
            'payment_plan' => 'installment',
            'payment_duration' => 'one_time',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['discount_value']);

        $this->assertDatabaseCount('allocations', 1);
        $this->assertDatabaseHas('allocations', [
            'id' => $allocation->id,
            'discount_type' => null,
            'discount_amount' => 0,
        ]);
    }

    public function test_percentage_discount_rounds_to_cents_and_full_discount_never_creates_a_negative_price(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $client = Client::factory()->create();
        $property = Property::factory()->create(['price' => 0.05]);

        $roundingAllocation = $this->createUnpaidAllocation($property, $client, [
            'discount_type' => 'percentage',
            'discount_value' => 10,
        ]);
        $this->assertSame(0.01, (float) $roundingAllocation->discount_amount);
        $this->assertSame(0.04, (float) $roundingAllocation->total_amount);

        $fullDiscountProperty = Property::factory()->create(['price' => 1000]);
        $fullDiscountClient = Client::factory()->create();
        $fullDiscount = $this->createUnpaidAllocation($fullDiscountProperty, $fullDiscountClient, [
            'discount_type' => 'percentage',
            'discount_value' => 100,
        ]);

        $this->assertSame(0.0, (float) $fullDiscount->total_amount);
        $this->assertSame(0.0, (float) $fullDiscount->balance);
        $this->assertSame(AllocationStatus::Completed, $fullDiscount->status);
        $this->assertSame(1, $fullDiscountProperty->fresh()->sold_count);
        $this->assertDatabaseCount('payments', 0);
    }

    private function createUnpaidAllocation(Property $property, Client $client, array $discount = []): Allocation
    {
        $response = $this->postJson('/api/v1/allocations', array_merge([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'total_amount' => $property->price,
            'payment_plan' => 'installment',
            'payment_duration' => '3_months',
            'payment_status' => 'unpaid',
        ], $discount))->assertCreated();

        return Allocation::query()->findOrFail($response->json('data.allocation.id'));
    }
}
