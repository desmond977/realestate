<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Enums\ServiceChargePaymentStatus;
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

    public function test_one_service_charge_category_is_editable_and_only_one_can_exist(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/v1/service-charge-categories')
            ->assertOk()
            ->assertJsonCount(1, 'data.categories')
            ->assertJsonPath('data.categories.0.name', 'Service Charge');

        $category = ServiceChargeCategory::query()->firstOrFail();
        $this->putJson("/api/v1/service-charge-categories/{$category->id}", [
            'name' => 'Building Services',
            'description' => 'Monthly shared services.',
            'monthly_amount' => 32000,
            'is_active' => true,
        ])->assertOk()
            ->assertJsonPath('data.category.name', 'Building Services')
            ->assertJsonPath('data.category.monthly_amount', '32000.00');

        $this->postJson('/api/v1/service-charge-categories', [
            'name' => 'Extra Category',
            'monthly_amount' => 3000,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['category']);
    }

    public function test_admin_can_delete_the_only_category_and_it_is_not_recreated(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $category = ServiceChargeCategory::query()->firstOrFail();

        $this->deleteJson("/api/v1/service-charge-categories/{$category->id}")->assertOk();
        $this->getJson('/api/v1/service-charge-categories')
            ->assertOk()
            ->assertJsonCount(0, 'data.categories');
    }

    public function test_admin_can_delete_used_category_without_removing_charge_history(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $category = ServiceChargeCategory::query()->firstOrFail();
        $categoryId = $category->id;
        $agreement = $this->createAgreement();
        $charge = $this->createCharge($agreement, $category);

        $this->deleteJson("/api/v1/service-charge-categories/{$categoryId}")
            ->assertOk()
            ->assertJsonPath('message', 'Service charge category deleted successfully.');

        $this->assertSoftDeleted('service_charge_categories', ['id' => $categoryId]);
        $this->assertDatabaseHas('service_charges', ['id' => $charge->id]);
        $this->getJson("/api/v1/service-charges/{$charge->id}")
            ->assertOk()
            ->assertJsonPath('data.service_charge.category.name', 'Service Charge');
    }

    public function test_staff_can_create_charge_for_active_tenancy_and_filter_its_status(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->firstOrFail();

        $response = $this->postJson('/api/v1/service-charges', $this->chargePayload($agreement, $category));

        $response->assertCreated()
            ->assertJsonPath('data.service_charge.rental_agreement.id', $agreement->id)
            ->assertJsonPath('data.service_charge.rental_property.id', $agreement->rental_property_id)
            ->assertJsonPath('data.service_charge.client.id', $agreement->client_id)
            ->assertJsonPath('data.service_charge.category.name', 'Service Charge')
            ->assertJsonPath('data.service_charge.amount_paid', 0)
            ->assertJsonPath('data.service_charge.balance', 500)
            ->assertJsonPath('data.service_charge.status', 'non_payment');

        $chargeId = $response->json('data.service_charge.id');
        $this->getJson('/api/v1/service-charges?status=non_payment&search=Service Charge')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('summary.amount_billed', 500)
            ->assertJsonPath('summary.outstanding_balance', 500)
            ->assertJsonPath('data.0.id', $chargeId);
    }

    public function test_monthly_generation_is_idempotent_and_excludes_inactive_tenancies(): void
    {
        $agreement = $this->createAgreement([
            'lease_start_date' => now()->startOfMonth()->addDays(4)->toDateString(),
        ]);
        $inactive = $this->createAgreement(['status' => 'terminated']);
        $month = now()->format('Y-m');

        $this->artisan('service-charges:generate-monthly', ['--month' => $month])->assertSuccessful();
        $this->artisan('service-charges:generate-monthly', ['--month' => $month])->assertSuccessful();

        $charges = ServiceCharge::query()->where('rental_agreement_id', $agreement->id)->get();
        $charge = $charges->firstOrFail();
        $this->assertSame($month, $charge->billing_month);
        $this->assertSame($month.'-01', $charge->billing_period_start->toDateString());
        $this->assertSame(now()->endOfMonth()->toDateString(), $charge->billing_period_end->toDateString());
        $this->assertCount(1, $charges);
        $this->assertSame(1, $charges->pluck('category_id')->unique()->count());
        $this->assertSame('45000.00', number_format((float) ServiceCharge::query()->where('rental_agreement_id', $agreement->id)->sum('amount_due'), 2, '.', ''));
        $this->assertSame(now()->toDateString() > $charge->due_date->toDateString() ? 'non_payment' : 'unpaid_pending', $charge->fresh()->paymentStatus());
        $this->assertDatabaseCount('service_charges', 1);
        $this->assertSame(1, ServiceCharge::query()->where('rental_agreement_id', $agreement->id)->distinct('category_id')->count('category_id'));
        $this->assertDatabaseMissing('service_charges', ['rental_agreement_id' => $inactive->id]);
    }

    public function test_monthly_generation_removes_exact_unpaid_duplicates_and_preserves_charge_history(): void
    {
        $month = now()->format('Y-m');
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();
        $category = ServiceChargeCategory::query()->firstOrFail();

        $unpaidAgreement = $this->createAgreement();
        $firstDuplicate = $this->createLegacyMonthlyCharge($unpaidAgreement, $category, $start, $end);
        $secondDuplicate = $this->createLegacyMonthlyCharge($unpaidAgreement, $category, $start, $end);

        $paidAgreement = $this->createAgreement();
        $paidCharge = $this->createLegacyMonthlyCharge($paidAgreement, $category, $start, $end);
        $historyDuplicate = $this->createLegacyMonthlyCharge($paidAgreement, $category, $start, $end);
        $historyDuplicate->payments()->create([
            'amount' => 100,
            'paid_at' => now(),
            'payment_method' => 'bank_transfer',
            'status' => ServiceChargePaymentStatus::Confirmed,
        ]);

        $previousMonth = now()->subMonthNoOverflow();
        $previousStart = $previousMonth->copy()->startOfMonth()->toDateString();
        $previousEnd = $previousMonth->copy()->endOfMonth()->toDateString();
        $pastAgreement = $this->createAgreement([
            'lease_start_date' => $previousStart,
            'lease_end_date' => now()->addMonths(11)->endOfMonth()->toDateString(),
        ]);
        $pastDuplicate = $this->createLegacyMonthlyCharge($pastAgreement, $category, $previousStart, $previousEnd);
        $pastDuplicateToRemove = $this->createLegacyMonthlyCharge($pastAgreement, $category, $previousStart, $previousEnd);

        $this->artisan('service-charges:generate-monthly', ['--month' => $month])->assertSuccessful();

        $this->assertSoftDeleted('service_charges', ['id' => $secondDuplicate->id]);
        $this->assertSoftDeleted('service_charges', ['id' => $pastDuplicateToRemove->id]);
        $this->assertDatabaseHas('service_charges', ['id' => $pastDuplicate->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('service_charges', ['id' => $firstDuplicate->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('service_charges', ['id' => $paidCharge->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('service_charges', ['id' => $historyDuplicate->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('service_charge_payments', [
            'service_charge_id' => $historyDuplicate->id,
            'amount' => 100,
        ]);
    }

    public function test_tenant_property_cannot_receive_duplicate_charge_in_same_month(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->firstOrFail();
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();
        $payload = $this->chargePayload($agreement, $category, [
            'billing_period_start' => $start,
            'billing_period_end' => $end,
            'billing_date' => $start,
            'due_date' => $start,
        ]);

        $this->postJson('/api/v1/service-charges', $payload)->assertCreated();
        $this->postJson('/api/v1/service-charges', $payload)->assertUnprocessable()
            ->assertJsonValidationErrors(['billing_period_start']);
        $this->assertDatabaseCount('service_charges', 1);
    }

    public function test_manual_month_sets_full_calendar_period_and_due_date_to_first(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement([
            'lease_start_date' => now()->startOfMonth()->addDays(4)->toDateString(),
        ]);
        $category = ServiceChargeCategory::query()->firstOrFail();
        $month = now()->format('Y-m');
        $start = now()->startOfMonth()->toDateString();
        $end = now()->endOfMonth()->toDateString();

        $response = $this->postJson('/api/v1/service-charges', $this->chargePayload($agreement, $category, [
            'billing_month' => $month,
            'billing_date' => now()->startOfMonth()->addDays(5)->toDateString(),
            'billing_period_start' => '2020-03-17',
            'billing_period_end' => '2020-03-22',
            'due_date' => '2030-12-31',
        ]));

        $response->assertCreated()
            ->assertJsonPath('data.service_charge.billing_month', $month)
            ->assertJsonPath('data.service_charge.billing_period_start', $start)
            ->assertJsonPath('data.service_charge.billing_period_end', $end)
            ->assertJsonPath('data.service_charge.billing_date', now()->startOfMonth()->addDays(5)->toDateString())
            ->assertJsonPath('data.service_charge.due_date', $start);
    }

    public function test_billing_month_must_overlap_lease_and_billing_date_must_be_in_month(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->firstOrFail();
        $outsideMonth = $agreement->lease_start_date->subMonthNoOverflow()->format('Y-m');

        $this->postJson('/api/v1/service-charges', $this->chargePayload($agreement, $category, [
            'billing_month' => $outsideMonth,
            'billing_date' => $outsideMonth.'-01',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['billing_month']);

        $this->postJson('/api/v1/service-charges', $this->chargePayload($agreement, $category, [
            'billing_date' => now()->startOfMonth()->subDay()->toDateString(),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['billing_date']);
    }

    public function test_authorized_user_can_edit_charge_before_payment_history_exists(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'staff']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->firstOrFail();
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
        $category = ServiceChargeCategory::query()->firstOrFail();
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
            ->assertJsonPath('data.payment.paid_date', now()->timezone(config('app.timezone'))->format('Y-m-d'))
            ->assertJsonPath('data.payment.paid_weekday', now()->timezone(config('app.timezone'))->format('l'))
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
        $category = ServiceChargeCategory::query()->firstOrFail();
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
        $category = ServiceChargeCategory::query()->firstOrFail();
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

    public function test_charges_with_payment_history_cannot_be_edited_but_admin_can_soft_delete_them(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $agreement = $this->createAgreement();
        $category = ServiceChargeCategory::query()->firstOrFail();
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

        $this->deleteJson("/api/v1/service-charges/{$charge->id}")->assertOk()
            ->assertJsonPath('message', 'Service charge deleted successfully.');

        $this->assertSoftDeleted('service_charges', ['id' => $charge->id]);
        $this->assertDatabaseHas('service_charge_payments', [
            'service_charge_id' => $charge->id,
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
            'billing_month' => substr($periodStart, 0, 7),
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

    private function createLegacyMonthlyCharge(
        RentalAgreement $agreement,
        ServiceChargeCategory $category,
        string $start,
        string $end
    ): ServiceCharge {
        return $agreement->serviceCharges()->create([
            'category_id' => $category->id,
            'rental_property_id' => $agreement->rental_property_id,
            'client_id' => $agreement->client_id,
            'description' => $category->name.' monthly service charge',
            'billing_period_start' => $start,
            'billing_period_end' => $end,
            'billing_date' => $start,
            'due_date' => $start,
            'amount_due' => 20000,
        ]);
    }
}
