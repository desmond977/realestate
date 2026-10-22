<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Models\Client;
use App\Models\RentalAgreement;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ServiceChargeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_service_charges(): void
    {
        $this->getJson('/api/v1/service-charges')->assertUnauthorized();
    }

    public function test_categories_include_defaults_and_admin_can_add_a_custom_category(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/v1/service-charge-categories')
            ->assertOk()
            ->assertJsonFragment(['name' => 'Security'])
            ->assertJsonFragment(['name' => 'Waste Management'])
            ->assertJsonFragment(['name' => 'Maintenance'])
            ->assertJsonFragment(['name' => 'Other']);

        $this->postJson('/api/v1/service-charge-categories', [
            'name' => 'Generator Fuel',
            'description' => 'Shared generator fuel.',
        ])->assertCreated()
            ->assertJsonPath('data.category.name', 'Generator Fuel');
    }

    public function test_staff_can_create_charge_for_active_tenancy_and_filter_its_status(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->where('name', 'Security')->firstOrFail();

        $response = $this->postJson('/api/v1/service-charges', $this->chargePayload($agreement, $category));

        $response->assertCreated()
            ->assertJsonPath('data.service_charge.rental_agreement.id', $agreement->id)
            ->assertJsonPath('data.service_charge.rental_property.id', $agreement->rental_property_id)
            ->assertJsonPath('data.service_charge.client.id', $agreement->client_id)
            ->assertJsonPath('data.service_charge.category.name', 'Security')
            ->assertJsonPath('data.service_charge.amount_paid', 0)
            ->assertJsonPath('data.service_charge.balance', 500)
            ->assertJsonPath('data.service_charge.status', 'overdue');

        $chargeId = $response->json('data.service_charge.id');
        $this->getJson('/api/v1/service-charges?status=overdue&search=Security')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $chargeId);
    }

    public function test_charge_period_must_be_within_lease_and_due_date_cannot_precede_billing_date(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->where('name', 'Maintenance')->firstOrFail();

        $this->postJson('/api/v1/service-charges', $this->chargePayload($agreement, $category, [
            'billing_period_start' => $agreement->lease_start_date->subDay()->toDateString(),
            'billing_date' => $agreement->lease_start_date->subDay()->toDateString(),
            'due_date' => $agreement->lease_start_date->subDay()->toDateString(),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['billing_period_start']);

        $this->postJson('/api/v1/service-charges', $this->chargePayload($agreement, $category, [
            'billing_date' => $agreement->lease_start_date->addDays(5)->toDateString(),
            'due_date' => $agreement->lease_start_date->addDays(4)->toDateString(),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['due_date']);
    }

    public function test_authorized_user_can_edit_charge_before_payment_history_exists(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->where('name', 'Maintenance')->firstOrFail();
        $charge = $this->createCharge($agreement, $category);

        $this->putJson("/api/v1/service-charges/{$charge->id}", $this->chargePayload($agreement, $category, [
            'description' => 'Quarterly maintenance',
            'amount_due' => 650,
        ]))->assertOk()
            ->assertJsonPath('data.service_charge.description', 'Quarterly maintenance')
            ->assertJsonPath('data.service_charge.amount_due', 650)
            ->assertJsonPath('data.service_charge.balance', 650);
    }

    public function test_accountant_can_record_partial_service_charge_payments_and_balances_are_separate(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->where('name', 'Waste Management')->firstOrFail();
        $charge = $this->createCharge($agreement, $category);
        $url = "/api/v1/service-charges/{$charge->id}/payments";
        $payload = [
            'amount' => 175,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'bank_transfer',
            'transaction_reference' => 'SC-REF-1001',
        ];

        $this->postJson($url, $payload)->assertCreated()
            ->assertJsonPath('data.service_charge.amount_paid', 175)
            ->assertJsonPath('data.service_charge.balance', 325)
            ->assertJsonPath('data.service_charge.status', 'partial')
            ->assertJsonPath('data.payment.status', 'confirmed')
            ->assertJsonPath('data.payment.receipt.receipt_number', fn ($value) => str_starts_with($value, 'SCREC-'));

        $this->postJson($url, array_replace($payload, [
            'amount' => 325,
            'transaction_reference' => 'SC-REF-1002',
        ]))->assertCreated()
            ->assertJsonPath('data.service_charge.amount_paid', 500)
            ->assertJsonPath('data.service_charge.balance', 0)
            ->assertJsonPath('data.service_charge.status', 'paid');

        $this->assertDatabaseCount('service_charge_payments', 2);
        $this->assertDatabaseCount('service_charge_receipts', 2);
        $this->assertDatabaseCount('rental_payments', 0);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('receipts', 0);

        $this->getJson("/api/v1/service-charges/{$charge->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.service_charge.payments')
            ->assertJsonPath('data.service_charge.amount_paid', 500)
            ->assertJsonPath('data.service_charge.balance', 0);
    }

    public function test_duplicate_reference_and_payment_over_balance_are_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->where('name', 'Security')->firstOrFail();
        $charge = $this->createCharge($agreement, $category);
        $url = "/api/v1/service-charges/{$charge->id}/payments";
        $payload = [
            'amount' => 400,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'cash',
            'transaction_reference' => 'SC-DUP-01',
        ];

        $this->postJson($url, $payload)->assertCreated();
        $this->postJson($url, $payload)->assertUnprocessable()
            ->assertJsonValidationErrors(['transaction_reference']);
        $this->postJson($url, array_replace($payload, [
            'amount' => 101,
            'transaction_reference' => 'SC-OVER-01',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);
    }

    public function test_roles_control_charge_and_payment_mutations(): void
    {
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->where('name', 'Other')->firstOrFail();
        $charge = $this->createCharge($agreement, $category);
        $payload = $this->chargePayload($agreement, $category);

        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $this->postJson('/api/v1/service-charge-categories', ['name' => 'Staff custom'])
            ->assertForbidden();
        $this->postJson("/api/v1/service-charges/{$charge->id}/payments", [
            'amount' => 100,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'cash',
        ])->assertForbidden();

        Sanctum::actingAs(User::factory()->create(['role' => 'accountant']));
        $this->postJson('/api/v1/service-charges', $payload)->assertForbidden();
        $this->getJson('/api/v1/service-charges')->assertOk();
    }

    public function test_charges_with_payment_history_cannot_be_edited_or_deleted(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->where('name', 'Maintenance')->firstOrFail();
        $charge = $this->createCharge($agreement, $category);

        $this->postJson("/api/v1/service-charges/{$charge->id}/payments", [
            'amount' => 100,
            'paid_at' => now()->toDateString(),
            'payment_method' => 'cash',
        ])->assertCreated();

        $this->putJson("/api/v1/service-charges/{$charge->id}", $this->chargePayload($agreement, $category, [
            'amount_due' => 750,
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['service_charge']);

        $this->deleteJson("/api/v1/service-charges/{$charge->id}")->assertUnprocessable()
            ->assertJsonValidationErrors(['service_charge']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createAgreement(array $overrides = []): RentalAgreement
    {
        $client = Client::factory()->create();
        $rentalProperty = RentalProperty::query()->create([
            'name' => 'Service Charge Estate',
            'location' => 'Lagos',
        ]);
        $start = now()->startOfMonth();

        return $rentalProperty->agreements()->create(array_replace([
            'client_id' => $client->id,
            'rental_amount' => 2500,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => $start->toDateString(),
            'lease_end_date' => $start->copy()->addYear()->subDay()->toDateString(),
            'status' => 'active',
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function chargePayload(RentalAgreement $agreement, ServiceChargeCategory $category, array $overrides = []): array
    {
        $periodStart = $agreement->lease_start_date->toDateString();
        $periodEnd = $agreement->lease_end_date->toDateString();

        return array_replace([
            'category_id' => $category->id,
            'rental_agreement_id' => $agreement->id,
            'description' => 'Shared services',
            'billing_period_start' => $periodStart,
            'billing_period_end' => $periodEnd,
            'billing_date' => $periodStart,
            'due_date' => $periodStart,
            'amount_due' => 500,
        ], $overrides);
    }

    private function createCharge(RentalAgreement $agreement, ServiceChargeCategory $category): ServiceCharge
    {
        return $agreement->serviceCharges()->create([
            'category_id' => $category->id,
            'rental_property_id' => $agreement->rental_property_id,
            'client_id' => $agreement->client_id,
            'description' => 'Shared services',
            'billing_period_start' => $agreement->lease_start_date->toDateString(),
            'billing_period_end' => $agreement->lease_end_date->toDateString(),
            'billing_date' => $agreement->lease_start_date->toDateString(),
            'due_date' => now()->toDateString(),
            'amount_due' => 500,
        ]);
    }
}
