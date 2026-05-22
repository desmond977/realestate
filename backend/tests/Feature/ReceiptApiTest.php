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

        Receipt::factory()->create([
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
            ->assertJsonPath('data.allocation.balance', 3000000)
            ->assertJsonPath('data.installment_summary.progress_percentage', 40)
            ->assertJsonCount(1, 'data.payment_history');
    }
}
