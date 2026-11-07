<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Enums\RentalPaymentStatus;
use App\Models\Client;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientChargePortalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_current_month_client_read_generates_charges_for_all_active_tenancies_once(): void
    {
        Cache::flush();
        $client = Client::factory()->create();
        $otherClient = Client::factory()->create();
        $inactiveClient = Client::factory()->create();
        $this->agreementFor($client);
        $this->agreementFor($otherClient);
        $inactiveAgreement = $this->agreementFor($inactiveClient);
        $inactiveAgreement->update(['status' => 'terminated']);

        Sanctum::actingAs($client);
        $this->getJson('/api/v1/client/service-charges')->assertOk();

        $month = now()->format('Y-m');
        $this->assertSame(1, ServiceCharge::query()->where('client_id', $client->id)->where('billing_month', $month)->count());
        $this->assertSame(1, ServiceCharge::query()->where('client_id', $otherClient->id)->where('billing_month', $month)->count());
        $this->assertSame(0, ServiceCharge::query()->where('client_id', $inactiveClient->id)->where('billing_month', $month)->count());

        $this->getJson('/api/v1/client/service-charges')->assertOk();
        $this->assertSame(2, ServiceCharge::query()->where('billing_month', $month)->count());
    }

    public function test_client_service_charge_ledger_is_month_scoped_and_private(): void
    {
        $client = Client::factory()->create();
        $otherClient = Client::factory()->create();
        $agreement = $this->agreementFor($client);
        $otherAgreement = $this->agreementFor($otherClient);
        $category = ServiceChargeCategory::query()->firstOrFail();
        $this->serviceCharge($agreement, $category, '2026-10', 10000);
        $this->serviceCharge($otherAgreement, $category, '2026-10', 10000);
        $this->serviceCharge($agreement, $category, '2026-09', 10000);

        Sanctum::actingAs($client);
        $this->getJson('/api/v1/client/service-charges?month=2026-10')
            ->assertOk()
            ->assertJsonCount(1, 'data.charges')
            ->assertJsonPath('data.charges.0.category.name', 'Service Charge')
            ->assertJsonPath('data.charges.0.amount_due', 10000)
            ->assertJsonPath('data.charges.0.amount_paid', 0)
            ->assertJsonPath('data.charges.0.balance', 10000)
            ->assertJsonPath('data.outstanding', 10000);

        $this->getJson('/api/v1/client/payment-proof-submissions/options')
            ->assertOk()
            ->assertJsonCount(2, 'data.service_charges')
            ->assertJsonPath('data.service_charges.0.category', 'Service Charge')
            ->assertJsonPath('data.service_charges.0.billing_month', '2026-10')
            ->assertJsonPath('data.service_charges.1.billing_month', '2026-09');
    }

    public function test_client_rent_ledger_keeps_confirmed_payments_separate(): void
    {
        $client = Client::factory()->create();
        $agreement = $this->agreementFor($client);
        $period = $agreement->paymentPeriods()->create([
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'due_date' => '2026-10-10',
            'amount_due' => 2500,
        ]);
        $period->payments()->create([
            'amount' => 500,
            'paid_at' => now(),
            'payment_method' => 'bank_transfer',
            'status' => RentalPaymentStatus::Confirmed,
        ]);

        Sanctum::actingAs($client);
        $this->getJson('/api/v1/client/rent-payments')
            ->assertOk()
            ->assertJsonPath('data.periods.0.amount_due', 2500)
            ->assertJsonPath('data.periods.0.amount_paid', 500)
            ->assertJsonPath('data.periods.0.balance', 2000)
            ->assertJsonPath('data.total_due', 2500)
            ->assertJsonPath('data.total_paid', 500)
            ->assertJsonPath('data.outstanding', 2000);
    }

    private function agreementFor(Client $client)
    {
        $property = RentalProperty::query()->create(['name' => 'Portal Home', 'location' => 'Lagos']);

        return $property->agreements()->create([
            'client_id' => $client->id,
            'rental_amount' => 2500,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2026-09-01',
            'lease_end_date' => '2027-08-31',
            'status' => 'active',
        ]);
    }

    private function serviceCharge($agreement, ServiceChargeCategory $category, string $month, float $amount): ServiceCharge
    {
        $start = $month.'-01';
        $end = date('Y-m-t', strtotime($start));

        return $agreement->serviceCharges()->create([
            'category_id' => $category->id,
            'rental_property_id' => $agreement->rental_property_id,
            'client_id' => $agreement->client_id,
            'billing_period_start' => $start,
            'billing_period_end' => $end,
            'billing_month' => $month,
            'billing_date' => $start,
            'due_date' => $end,
            'amount_due' => $amount,
        ]);
    }
}
