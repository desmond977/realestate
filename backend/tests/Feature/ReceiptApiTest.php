<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Receipt;
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
        Sanctum::actingAs(User::factory()->create());
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
        Sanctum::actingAs(User::factory()->create());
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
}
