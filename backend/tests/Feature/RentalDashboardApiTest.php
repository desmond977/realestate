<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Enums\RentalPaymentStatus;
use App\Enums\ServiceChargePaymentStatus;
use App\Models\Client;
use App\Models\RentalAgreement;
use App\Models\RentalPayment;
use App\Models\RentalPaymentPeriod;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use App\Models\ServiceChargePayment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RentalDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_guest_cannot_access_rental_dashboard(): void
    {
        $this->getJson('/api/v1/rental-dashboard')->assertUnauthorized();
    }

    public function test_dashboard_is_limited_to_operations_roles(): void
    {
        Sanctum::actingAs(Client::factory()->create());

        $this->getJson('/api/v1/rental-dashboard')->assertForbidden();
    }

    public function test_rental_dashboard_returns_zeroes_for_empty_data_and_validates_date_period(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));

        $this->getJson('/api/v1/rental-dashboard?period=30_days')
            ->assertOk()
            ->assertJsonPath('data.stats.rental_revenue_collected', 0)
            ->assertJsonPath('data.stats.outstanding_rent', 0)
            ->assertJsonPath('data.stats.overdue_rent', 0)
            ->assertJsonPath('data.stats.total_rental_properties', 0)
            ->assertJsonPath('data.stats.occupied_rental_properties', 0)
            ->assertJsonPath('data.stats.vacant_rental_properties', 0)
            ->assertJsonPath('data.service_charges.amount_billed', 0)
            ->assertJsonPath('data.service_charges.amount_collected', 0)
            ->assertJsonPath('data.service_charges.outstanding_balance', 0)
            ->assertJsonCount(30, 'data.revenue_trend')
            ->assertJsonCount(0, 'data.upcoming_rent_due')
            ->assertJsonCount(0, 'data.recent_rental_payments');

        $this->getJson('/api/v1/rental-dashboard?period=all_time')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['period']);
    }

    public function test_dashboard_aggregates_confirmed_rent_and_service_charge_records_without_mixing_them(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-22 11:00:00'));
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));

        $tenant = Client::factory()->create();
        $occupiedProperty = RentalProperty::query()->create(['name' => 'Harbour View']);
        $vacantProperty = RentalProperty::query()->create(['name' => 'Garden Court']);
        $agreement = $occupiedProperty->agreements()->create([
            'client_id' => $tenant->id,
            'rental_amount' => 1000,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2026-09-01',
            'lease_end_date' => '2027-08-31',
            'status' => 'active',
        ]);
        $vacantProperty->agreements()->create([
            'client_id' => Client::factory()->create()->id,
            'rental_amount' => 1200,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => '2026-09-01',
            'lease_end_date' => '2027-08-31',
            'status' => 'pending',
        ]);

        $overduePeriod = $agreement->paymentPeriods()->create([
            'period_start' => '2026-09-01',
            'period_end' => '2026-09-30',
            'due_date' => '2026-10-01',
            'amount_due' => 500,
        ]);
        $upcomingPeriod = $agreement->paymentPeriods()->create([
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'due_date' => '2026-10-30',
            'amount_due' => 1000,
        ]);

        $this->rentalPayment($overduePeriod, 50, '2026-09-10', RentalPaymentStatus::Confirmed);
        $currentPayment = $this->rentalPayment($overduePeriod, 100, '2026-10-10', RentalPaymentStatus::Confirmed);
        $this->rentalPayment($overduePeriod, 25, '2026-10-12', RentalPaymentStatus::Pending);
        $upcomingPayment = $this->rentalPayment($upcomingPeriod, 200, '2026-10-11', RentalPaymentStatus::Confirmed);
        $this->rentalPayment($upcomingPeriod, 35, '2026-10-15', RentalPaymentStatus::Failed);

        $category = ServiceChargeCategory::query()->where('name', 'Security')->firstOrFail();
        $charge = ServiceCharge::query()->create([
            'category_id' => $category->id,
            'rental_agreement_id' => $agreement->id,
            'rental_property_id' => $occupiedProperty->id,
            'client_id' => $tenant->id,
            'description' => 'October security',
            'billing_period_start' => '2026-10-01',
            'billing_period_end' => '2026-10-31',
            'billing_date' => '2026-10-05',
            'due_date' => '2026-10-31',
            'amount_due' => 250,
        ]);
        $this->serviceChargePayment($charge, 25, '2026-09-10', ServiceChargePaymentStatus::Confirmed);
        $this->serviceChargePayment($charge, 40, '2026-10-15', ServiceChargePaymentStatus::Confirmed);
        $this->serviceChargePayment($charge, 100, '2026-10-18', ServiceChargePaymentStatus::Pending);

        $this->getJson('/api/v1/rental-dashboard?period=30_days')
            ->assertOk()
            ->assertJsonPath('data.stats.rental_revenue_collected', 300)
            ->assertJsonPath('data.stats.outstanding_rent', 350)
            ->assertJsonPath('data.stats.overdue_rent', 350)
            ->assertJsonPath('data.stats.total_rental_properties', 2)
            ->assertJsonPath('data.stats.occupied_rental_properties', 1)
            ->assertJsonPath('data.stats.vacant_rental_properties', 1)
            ->assertJsonPath('data.service_charges.amount_billed', 250)
            ->assertJsonPath('data.service_charges.amount_collected', 40)
            ->assertJsonPath('data.service_charges.outstanding_balance', 185)
            ->assertJsonCount(2, 'data.recent_rental_payments')
            ->assertJsonPath('data.recent_rental_payments.0.id', $upcomingPayment->id)
            ->assertJsonPath('data.recent_rental_payments.1.id', $currentPayment->id)
            ->assertJsonCount(1, 'data.upcoming_rent_due')
            ->assertJsonPath('data.upcoming_rent_due.0.id', $upcomingPeriod->id)
            ->assertJsonPath('data.upcoming_rent_due.0.balance', 800)
            ->assertJsonPath('data.revenue_trend.17.amount', 100)
            ->assertJsonPath('data.revenue_trend.18.amount', 200);
    }

    private function rentalPayment(
        RentalPaymentPeriod $period,
        float $amount,
        string $paidAt,
        RentalPaymentStatus $status
    ): RentalPayment {
        return $period->payments()->create([
            'amount' => $amount,
            'paid_at' => $paidAt,
            'payment_method' => 'bank_transfer',
            'status' => $status,
        ]);
    }

    private function serviceChargePayment(
        ServiceCharge $charge,
        float $amount,
        string $paidAt,
        ServiceChargePaymentStatus $status
    ): ServiceChargePayment {
        return $charge->payments()->create([
            'amount' => $amount,
            'paid_at' => $paidAt,
            'payment_method' => 'bank_transfer',
            'status' => $status,
        ]);
    }

}
