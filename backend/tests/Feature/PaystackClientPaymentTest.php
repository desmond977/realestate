<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Models\Client;
use App\Models\CompanySetting;
use App\Models\PaystackClientTransaction;
use App\Models\RentalAgreement;
use App\Models\RentalPaymentPeriod;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaystackClientPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.paystack.secret_key', 'sk_test_unit');
        config()->set('services.paystack.webhook_secret', 'whsec_unit');
        config()->set('services.paystack.frontend_url', 'http://localhost:5173');
    }

    public function test_client_can_initialize_a_rental_checkout_and_server_records_it_after_verification(): void
    {
        [$client, $period] = $this->rentalForClient();
        Sanctum::actingAs($client);
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/transaction/initialize')) return Http::response(['status' => true, 'data' => ['authorization_url' => 'https://checkout.paystack.com/abc', 'access_code' => 'abc', 'reference' => $request['reference']]]);
            if (str_contains($request->url(), '/transaction/verify/')) return Http::response(['status' => true, 'data' => ['status' => 'success', 'reference' => $request->url() ? PaystackClientTransaction::first()->reference : '', 'amount' => 25000, 'currency' => 'NGN', 'id' => 7001]]);
            return Http::response([], 404);
        });

        $response = $this->postJson('/api/v1/client/paystack/checkout', ['category' => 'rental', 'target_id' => $period->id, 'amount' => 250]);
        $response->assertCreated()->assertJsonPath('data.checkout_url', 'https://checkout.paystack.com/abc');
        $transaction = PaystackClientTransaction::firstOrFail();
        $this->assertSame('pending', $transaction->status);
        $this->assertSame('250.00', $transaction->amount);

        $this->getJson('/api/v1/client/paystack/'.$transaction->reference)->assertOk()->assertJsonPath('data.status', 'paid');
        $this->assertDatabaseCount('rental_payments', 1);
        $this->assertDatabaseCount('rental_receipts', 1);
        $this->assertDatabaseHas('rental_payments', ['transaction_reference' => $transaction->reference, 'payment_method' => 'paystack', 'status' => 'confirmed']);
    }

    public function test_service_charge_success_webhook_creates_one_service_charge_payment_and_receipt_even_when_replayed(): void
    {
        [$client, , $agreement, $rentalProperty] = $this->rentalForClient();
        $charge = ServiceCharge::query()->create([
            'category_id' => ServiceChargeCategory::query()->firstOrFail()->id,
            'rental_agreement_id' => $agreement->id,
            'rental_property_id' => $rentalProperty->id,
            'client_id' => $client->id,
            'billing_period_start' => now()->startOfMonth()->toDateString(),
            'billing_period_end' => now()->endOfMonth()->toDateString(),
            'billing_date' => now()->toDateString(),
            'due_date' => now()->toDateString(),
            'amount_due' => 1000,
        ]);
        Sanctum::actingAs($client);
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/transaction/initialize')) return Http::response(['status' => true, 'data' => ['authorization_url' => 'https://checkout.paystack.com/abc', 'access_code' => 'abc', 'reference' => $request['reference']]]);
            if (str_contains($request->url(), '/transaction/verify/')) return Http::response(['status' => true, 'data' => ['status' => 'success', 'reference' => PaystackClientTransaction::firstOrFail()->reference, 'amount' => 30000, 'currency' => 'NGN', 'id' => 7002]]);
            return Http::response([], 404);
        });
        $this->postJson('/api/v1/client/paystack/checkout', ['category' => 'service_charge', 'target_id' => $charge->id, 'amount' => 300])->assertCreated();
        $transaction = PaystackClientTransaction::firstOrFail();
        $body = json_encode(['event' => 'charge.success', 'data' => ['reference' => $transaction->reference]]);
        $timestamp = (string) time();
        $sig = hash_hmac('sha512', $timestamp.'.'.$body, 'whsec_unit');
        $headers = ['HTTP_PAYSTACK_SIGNATURE' => 't='.$timestamp.',v1=whk_test:'.$sig, 'CONTENT_TYPE' => 'application/json'];

        $this->call('POST', '/api/v1/paystack/webhook', [], [], [], $headers, $body)->assertOk();
        $this->call('POST', '/api/v1/paystack/webhook', [], [], [], $headers, $body)->assertOk();
        $this->assertDatabaseCount('service_charge_payments', 1);
        $this->assertDatabaseCount('service_charge_receipts', 1);
        $this->assertDatabaseHas('service_charge_payments', ['transaction_reference' => $transaction->reference, 'payment_method' => 'paystack', 'status' => 'confirmed']);
    }

    public function test_pending_and_failed_verifications_do_not_record_payment_and_forged_webhook_is_rejected(): void
    {
        [$client, $period] = $this->rentalForClient();
        Sanctum::actingAs($client);
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/transaction/initialize')) return Http::response(['status' => true, 'data' => ['authorization_url' => 'https://checkout.paystack.com/abc', 'access_code' => 'abc']]);
            if (str_contains($request->url(), '/transaction/verify/')) return Http::response(['status' => true, 'data' => ['status' => 'pending', 'reference' => PaystackClientTransaction::firstOrFail()->reference, 'amount' => 25000, 'currency' => 'NGN', 'id' => 7003]]);
            return Http::response([], 404);
        });
        $this->postJson('/api/v1/client/paystack/checkout', ['category' => 'rental', 'target_id' => $period->id, 'amount' => 250])->assertCreated();
        $transaction = PaystackClientTransaction::firstOrFail();
        $this->getJson('/api/v1/client/paystack/'.$transaction->reference)->assertOk()->assertJsonPath('data.status', 'pending');
        $this->assertDatabaseCount('rental_payments', 0);
        $this->call('POST', '/api/v1/paystack/webhook', [], [], [], ['HTTP_PAYSTACK_SIGNATURE' => 'invalid', 'CONTENT_TYPE' => 'application/json'], '{"event":"charge.success"}')->assertUnauthorized();
        $this->assertDatabaseCount('rental_payments', 0);
    }

    public function test_failed_verification_marks_checkout_failed_without_posting_a_payment(): void
    {
        [$client, $period] = $this->rentalForClient();
        Sanctum::actingAs($client);
        Http::fake(function ($request) {
            if (str_ends_with($request->url(), '/transaction/initialize')) return Http::response(['status' => true, 'data' => ['authorization_url' => 'https://checkout.paystack.com/abc', 'access_code' => 'abc']]);
            if (str_contains($request->url(), '/transaction/verify/')) return Http::response(['status' => true, 'data' => ['status' => 'failed', 'reference' => PaystackClientTransaction::firstOrFail()->reference, 'amount' => 25000, 'currency' => 'NGN', 'id' => 7004]]);
            return Http::response([], 404);
        });
        $this->postJson('/api/v1/client/paystack/checkout', ['category' => 'rental', 'target_id' => $period->id, 'amount' => 250])->assertCreated();
        $transaction = PaystackClientTransaction::firstOrFail();
        $this->getJson('/api/v1/client/paystack/'.$transaction->reference)->assertOk()->assertJsonPath('data.status', 'failed');
        $this->assertDatabaseCount('rental_payments', 0);
        $this->assertDatabaseHas('paystack_client_transactions', ['id' => $transaction->id, 'status' => 'failed']);
    }

    public function test_checkout_cannot_pay_another_clients_rental_or_service_charge(): void
    {
        [$owner, $period] = $this->rentalForClient();
        $other = Client::factory()->create();
        Sanctum::actingAs($other);
        Http::fake();
        $this->postJson('/api/v1/client/paystack/checkout', ['category' => 'rental', 'target_id' => $period->id, 'amount' => 100])->assertNotFound();
        $this->assertDatabaseCount('paystack_client_transactions', 0);
        Http::assertNothingSent();
    }

    private function rentalForClient(): array
    {
        $client = Client::factory()->create();
        $property = RentalProperty::query()->create(['name' => 'Demo rental']);
        $agreement = RentalAgreement::query()->create(['rental_property_id' => $property->id, 'client_id' => $client->id, 'rental_amount' => 1000, 'rental_frequency' => RentalFrequency::Monthly, 'lease_start_date' => now()->startOfMonth()->toDateString(), 'lease_end_date' => now()->addYear()->endOfMonth()->toDateString(), 'status' => 'active']);
        $period = RentalPaymentPeriod::query()->create(['rental_agreement_id' => $agreement->id, 'period_start' => now()->startOfMonth()->toDateString(), 'period_end' => now()->endOfMonth()->toDateString(), 'due_date' => now()->toDateString(), 'amount_due' => 1000]);
        return [$client, $period, $agreement, $property];
    }
}
