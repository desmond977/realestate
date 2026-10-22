<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Models\Client;
use App\Models\RentalAgreement;
use App\Models\RentalPaymentPeriod;
use App\Models\RentalProperty;
use App\Models\User;
use App\Services\RealEstate\RentalPaymentScheduleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RentalPaymentApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_rental_payment_periods(): void
    {
        $this->getJson('/api/v1/rental-payment-periods')->assertUnauthorized();
    }

    public function test_payment_periods_follow_monthly_lease_frequency(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement([
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2026-01-31',
            'lease_end_date' => '2026-04-30',
        ]);

        $response = $this->getJson('/api/v1/rental-payment-periods?rental_id='.$agreement->id);

        $response->assertOk()
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0.period_start', '2026-04-30')
            ->assertJsonPath('data.3.period_start', '2026-01-31')
            ->assertJsonPath('data.3.period_end', '2026-02-27')
            ->assertJsonPath('data.3.amount_due', 1200)
            ->assertJsonPath('data.3.status', 'overdue');
    }

    public function test_payment_periods_are_generated_using_the_configured_rental_frequency(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $weekly = $this->createAgreement([
            'rental_frequency' => RentalFrequency::Weekly,
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2026-10-21',
        ]);
        $biweekly = $this->createAgreement([
            'rental_frequency' => RentalFrequency::Biweekly,
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2026-10-31',
        ]);
        $quarterly = $this->createAgreement([
            'rental_frequency' => RentalFrequency::Quarterly,
            'lease_start_date' => '2026-01-01',
            'lease_end_date' => '2026-12-31',
        ]);
        $annual = $this->createAgreement([
            'rental_frequency' => RentalFrequency::Annually,
            'lease_start_date' => '2026-01-01',
            'lease_end_date' => '2027-12-31',
        ]);

        $this->assertSame(3, $weekly->paymentPeriods()->count());
        $this->assertSame(3, $biweekly->paymentPeriods()->count());
        $this->assertSame(4, $quarterly->paymentPeriods()->count());
        $this->assertSame(2, $annual->paymentPeriods()->count());
    }

    public function test_accountant_can_record_partial_payments_with_separate_receipts_and_history(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $agreement = $this->createAgreement([
            'lease_start_date' => now()->toDateString(),
            'lease_end_date' => now()->addMonthNoOverflow()->subDay()->toDateString(),
        ]);
        $period = $agreement->paymentPeriods()->firstOrFail();
        $paymentUrl = "/api/v1/rental-payment-periods/{$period->id}/payments";

        $first = $this->postJson($paymentUrl, [
            'amount' => 300,
            'paid_at' => '2026-10-04',
            'payment_method' => 'bank_transfer',
            'transaction_reference' => 'RENT-REF-001',
        ]);

        $first->assertCreated()
            ->assertJsonPath('data.payment.status', 'confirmed')
            ->assertJsonPath('data.payment.amount', 300)
            ->assertJsonPath('data.payment.receipt.receipt_number', fn ($value) => str_starts_with($value, 'RREC-'))
            ->assertJsonPath('data.period.amount_paid', 300)
            ->assertJsonPath('data.period.balance', 900)
            ->assertJsonPath('data.period.status', 'partial');

        $this->postJson($paymentUrl, [
            'amount' => 900,
            'paid_at' => '2026-10-05',
            'payment_method' => 'cash',
            'transaction_reference' => 'RENT-REF-002',
        ])->assertCreated()
            ->assertJsonPath('data.period.amount_paid', 1200)
            ->assertJsonPath('data.period.balance', 0)
            ->assertJsonPath('data.period.status', 'paid');

        $this->assertDatabaseCount('rental_payments', 2);
        $this->assertDatabaseCount('rental_receipts', 2);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('receipts', 0);

        $this->getJson("/api/v1/rental-payment-periods/{$period->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.period.payments')
            ->assertJsonPath('data.period.amount_paid', 1200);
    }

    public function test_payment_cannot_exceed_period_balance(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement([
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2026-10-31',
        ]);
        $period = $agreement->paymentPeriods()->firstOrFail();

        $this->postJson("/api/v1/rental-payment-periods/{$period->id}/payments", [
            'amount' => 1200.01,
            'paid_at' => '2026-10-05',
            'payment_method' => 'cash',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);

        $this->assertDatabaseCount('rental_payments', 0);
    }

    public function test_duplicate_transaction_reference_is_rejected_across_periods(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement([
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2026-11-30',
        ]);
        $periods = $agreement->paymentPeriods()->orderBy('period_start')->get();

        $payload = [
            'amount' => 300,
            'paid_at' => '2026-10-05',
            'payment_method' => 'cash',
            'transaction_reference' => 'UNIQUE-RENT-REF',
        ];

        $this->postJson("/api/v1/rental-payment-periods/{$periods[0]->id}/payments", $payload)
            ->assertCreated();
        $this->postJson("/api/v1/rental-payment-periods/{$periods[1]->id}/payments", $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['transaction_reference']);
    }

    public function test_staff_can_view_but_cannot_record_rental_payments(): void
    {
        $agreement = $this->createAgreement();
        $period = $agreement->paymentPeriods()->firstOrFail();
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->getJson('/api/v1/rental-payment-periods')->assertOk();
        $this->postJson("/api/v1/rental-payment-periods/{$period->id}/payments", [
            'amount' => 100,
            'paid_at' => '2026-10-05',
            'payment_method' => 'cash',
        ])->assertForbidden();
    }

    public function test_non_active_rental_agreement_cannot_receive_payments(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement(['status' => 'pending']);
        $period = $agreement->paymentPeriods()->firstOrFail();

        $this->postJson("/api/v1/rental-payment-periods/{$period->id}/payments", [
            'amount' => 100,
            'paid_at' => '2026-10-05',
            'payment_method' => 'cash',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['rental_payment_period_id']);

        $this->assertDatabaseCount('rental_payments', 0);
    }

    public function test_paid_lease_terms_cannot_be_changed(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement();
        $period = $agreement->paymentPeriods()->firstOrFail();

        $this->postJson("/api/v1/rental-payment-periods/{$period->id}/payments", [
            'amount' => 100,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'cash',
        ])->assertCreated();

        $this->putJson("/api/v1/rentals/{$agreement->id}", [
            'property_name' => 'Rental Test Home',
            'property_location' => 'Lagos',
            'client_id' => $agreement->client_id,
            'rental_amount' => 1300,
            'rental_frequency' => 'monthly',
            'lease_start_date' => $agreement->lease_start_date->toDateString(),
            'lease_end_date' => $agreement->lease_end_date->toDateString(),
            'status' => 'active',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['rental_amount']);

        $this->assertDatabaseHas('rental_payment_periods', [
            'id' => $period->id,
            'amount_due' => 1200,
        ]);
        $this->assertDatabaseHas('rental_payments', [
            'rental_payment_period_id' => $period->id,
            'amount' => 100,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createAgreement(array $overrides = []): RentalAgreement
    {
        $client = Client::factory()->create();
        $rentalProperty = RentalProperty::query()->create([
            'name' => 'Rental Test Home',
            'location' => 'Lagos',
        ]);

        $agreement = $rentalProperty->agreements()->create(array_replace([
            'client_id' => $client->id,
            'rental_amount' => 1200,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2026-10-01',
            'lease_end_date' => '2027-09-30',
            'status' => 'active',
        ], $overrides));

        app(RentalPaymentScheduleService::class)->ensurePeriods($agreement);

        return $agreement;
    }
}
