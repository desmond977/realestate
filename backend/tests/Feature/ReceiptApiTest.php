<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Allocation;
use App\Models\Receipt;
use App\Models\Realtor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReceiptApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_receipts(): void
    {
        $this->getJson('/api/v1/receipts')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_list_receipts_with_search(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $client = Client::factory()->create([
            'first_name' => 'Ada',
            'last_name' => 'Okafor',
        ]);
        $property = Property::factory()->create([
            'title' => 'Lekki Garden Plot',
        ]);
        $payment = Payment::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
            'amount' => 2500000,
        ]);

        Receipt::factory()->create([
            'payment_id' => $payment->id,
            'receipt_number' => 'REC-SEARCH-001',
        ]);

        $otherClient = Client::factory()->create([
            'first_name' => 'Bola',
            'last_name' => 'Nwosu',
            'email' => 'bola.nwosu@example.com',
        ]);
        $otherPayment = Payment::factory()->create([
            'client_id' => $otherClient->id,
        ]);

        Receipt::factory()->create([
            'payment_id' => $otherPayment->id,
            'receipt_number' => 'REC-OTHER-001',
        ]);

        $response = $this->getJson('/api/v1/receipts?search=Ada');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.receipt_number', 'REC-SEARCH-001')
            ->assertJsonPath('data.0.payment.client.full_name', 'Ada Okafor')
            ->assertJsonPath('data.0.payment.property.title', 'Lekki Garden Plot')
            ->assertJsonPath('data.0.payment.amount', 2500000);
    }

    public function test_authenticated_user_can_show_receipt(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $receipt = Receipt::factory()->create([
            'receipt_number' => 'REC-SHOW-001',
        ]);

        $this->getJson("/api/v1/receipts/{$receipt->id}")
            ->assertOk()
            ->assertJsonPath('data.receipt.receipt_number', 'REC-SHOW-001')
            ->assertJsonStructure([
                'data' => [
                    'receipt' => [
                        'payment',
                        'issued_by',
                    ],
                ],
            ]);
    }

    public function test_authenticated_user_can_fetch_receipt_document(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $realtor = Realtor::factory()->create(['full_name' => 'Prime Realtor']);
        $client = Client::factory()->create(['realtor_id' => $realtor->id]);
        $property = Property::factory()->create([
            'title' => 'Premium Plot',
            'price' => 5000000,
            'land_size' => '500 sqm',
            'document_type' => 'C of O',
        ]);
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
            'realtor_id' => $realtor->id,
            'total_amount' => 5000000,
            'amount_paid' => 2000000,
            'balance' => 3000000,
            'payment_duration' => '6_months',
        ]);
        $payment = Payment::factory()->create([
            'allocation_id' => $allocation->id,
            'client_id' => $client->id,
            'property_id' => $property->id,
            'realtor_id' => $realtor->id,
            'amount' => 2000000,
        ]);
        $receipt = Receipt::factory()->create([
            'payment_id' => $payment->id,
            'receipt_number' => 'REC-DOC-001',
        ]);

        $this->getJson("/api/v1/receipts/{$receipt->id}/document")
            ->assertOk()
            ->assertJsonPath('data.receipt.number', 'REC-DOC-001')
            ->assertJsonPath('data.client.full_name', $client->full_name)
            ->assertJsonPath('data.realtor.full_name', 'Prime Realtor')
            ->assertJsonPath('data.property.title', 'Premium Plot')
            ->assertJsonPath('data.allocation.payment_duration', '6_months')
            ->assertJsonPath('data.allocation.payment_duration_label', '6 Months')
            ->assertJsonPath('data.allocation.balance', 3000000)
            ->assertJsonPath('data.installment_summary.progress_percentage', 40)
            ->assertJsonCount(1, 'data.payment_history');
    }

    public function test_each_successful_payment_creates_immutable_receipt_history(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));

        $client = Client::factory()->create();
        $property = Property::factory()->create([
            'price' => 9000000,
        ]);
        $allocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $property->id,
            'total_amount' => 9000000,
            'amount_paid' => 0,
            'balance' => 9000000,
        ]);

        $this->postJson('/api/v1/payments', [
            'allocation_id' => $allocation->id,
            'amount' => 1000000,
            'payment_method' => 'bank_transfer',
            'transaction_reference' => 'TXN-HISTORY-001',
        ])->assertCreated()
            ->assertJsonPath('data.payment.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000001');

        $firstReceipt = Receipt::query()->firstOrFail();

        $this->postJson('/api/v1/payments', [
            'allocation_id' => $allocation->id,
            'amount' => 2000000,
            'payment_method' => 'pos',
            'transaction_reference' => 'TXN-HISTORY-002',
        ])->assertCreated()
            ->assertJsonPath('data.payment.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000002');

        $secondReceipt = Receipt::query()->where('id', '!=', $firstReceipt->id)->firstOrFail();

        $this->postJson('/api/v1/payments', [
            'allocation_id' => $allocation->id,
            'amount' => 3000000,
            'payment_method' => 'cash',
            'transaction_reference' => 'TXN-HISTORY-003',
        ])->assertCreated()
            ->assertJsonPath('data.payment.receipt.receipt_number', 'REC-'.now()->format('Ymd').'-000003');

        $this->assertDatabaseCount('payments', 3);
        $this->assertDatabaseCount('receipts', 3);

        $this->getJson('/api/v1/receipts')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.receipt_number', 'REC-'.now()->format('Ymd').'-000003')
            ->assertJsonPath('data.1.receipt_number', 'REC-'.now()->format('Ymd').'-000002')
            ->assertJsonPath('data.2.receipt_number', 'REC-'.now()->format('Ymd').'-000001');

        $allocation->forceFill([
            'amount_paid' => 8750000,
            'balance' => 250000,
        ])->save();

        $firstReceipt->payment->forceFill([
            'amount' => 7777777,
            'payment_method' => 'edited_live_method',
        ])->save();

        $this->getJson("/api/v1/receipts/{$firstReceipt->id}/document")
            ->assertOk()
            ->assertJsonPath('data.receipt.number', 'REC-'.now()->format('Ymd').'-000001')
            ->assertJsonPath('data.payment.amount', 1000000)
            ->assertJsonPath('data.payment.method', 'bank_transfer')
            ->assertJsonPath('data.allocation.amount_paid', 1000000)
            ->assertJsonPath('data.allocation.balance', 8000000)
            ->assertJsonCount(1, 'data.payment_history');

        $this->getJson("/api/v1/receipts/{$secondReceipt->id}/document")
            ->assertOk()
            ->assertJsonPath('data.receipt.number', 'REC-'.now()->format('Ymd').'-000002')
            ->assertJsonPath('data.payment.amount', 2000000)
            ->assertJsonPath('data.allocation.amount_paid', 3000000)
            ->assertJsonPath('data.allocation.balance', 6000000)
            ->assertJsonCount(2, 'data.payment_history');
    }
}
