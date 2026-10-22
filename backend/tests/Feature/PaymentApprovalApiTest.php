<?php

namespace Tests\Feature;

use App\Enums\PaymentProofSubmissionStatus;
use App\Enums\RentalFrequency;
use App\Enums\RentalPaymentStatus;
use App\Mail\PaymentProofReviewedMail;
use App\Models\Client;
use App\Models\PaymentProofSubmission;
use App\Models\RentalPaymentPeriod;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use App\Models\User;
use App\Services\RealEstate\RentalPaymentScheduleService;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentApprovalApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Mail::fake();
    }

    public function test_only_admin_can_list_review_approve_reject_or_view_evidence(): void
    {
        $client = Client::factory()->create();
        $submission = $this->rentalSubmission($client);

        foreach ([
            User::factory()->create(['role' => 'staff']),
            User::factory()->create(['role' => 'accountant']),
            Client::factory()->create(),
        ] as $user) {
            Sanctum::actingAs($user);
            $this->getJson('/api/v1/payment-approvals')->assertForbidden();
            $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")->assertForbidden();
            $this->postJson("/api/v1/payment-approvals/{$submission->id}/reject", [
                'rejection_reason' => 'Invalid proof',
            ])->assertForbidden();
            $this->getJson("/api/v1/payment-approvals/{$submission->id}/proof")->assertForbidden();
        }
    }

    public function test_admin_can_approve_partial_rental_proof_once_and_payment_is_counted_in_rental_dashboard(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $period = $this->createPeriod($client);
        $period->payments()->create([
            'amount' => 300,
            'paid_at' => now()->subDays(2),
            'payment_method' => 'bank_transfer',
            'transaction_reference' => 'PREVIOUS-RENT',
            'status' => RentalPaymentStatus::Confirmed,
        ]);
        $submission = $this->rentalSubmission($client, $period, [
            'amount' => 400,
            'transaction_reference' => 'CLIENT-PROOF-RENT-001',
        ]);
        Storage::disk('local')->put($submission->proof_of_payment_path, 'fake evidence');
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/payment-approvals?status=pending&payment_category=rental')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.client.full_name', $client->full_name)
            ->assertJsonPath('data.0.rental_payment_period.rental_property', 'Proof Rental')
            ->assertJsonPath('data.0.amount', 400);
        $this->get("/api/v1/payment-approvals/{$submission->id}/proof")
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.recorded_payment.receipt_number', fn ($value) => str_starts_with($value, 'RREC-'));

        $submission->refresh();
        $this->assertSame(PaymentProofSubmissionStatus::Approved, $submission->status);
        $this->assertSame($admin->id, $submission->reviewed_by);
        $this->assertNotNull($submission->reviewed_at);
        $this->assertDatabaseCount('rental_payments', 2);
        $this->assertDatabaseCount('rental_receipts', 1);
        $this->assertDatabaseHas('rental_payments', [
            'rental_payment_period_id' => $period->id,
            'amount' => 400,
            'status' => 'confirmed',
            'payment_proof_submission_id' => $submission->id,
            'transaction_reference' => 'CLIENT-PROOF-RENT-001',
        ]);
        $this->assertEquals(700, $period->fresh()->confirmedAmountPaid());

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['submission']);
        $this->assertDatabaseCount('rental_payments', 2);

        Mail::assertQueued(PaymentProofReviewedMail::class, 1);

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/rental-dashboard?period=30_days')
            ->assertOk()
            ->assertJsonPath('data.stats.rental_revenue_collected', 700);
    }

    public function test_admin_can_approve_service_charge_submission_and_update_only_its_ledger(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $charge = $this->createServiceCharge($client);
        $submission = $this->serviceChargeSubmission($client, $charge);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.recorded_payment.receipt_number', fn ($value) => str_starts_with($value, 'SCREC-'));

        $this->assertDatabaseHas('service_charge_payments', [
            'service_charge_id' => $charge->id,
            'amount' => 125,
            'status' => 'confirmed',
            'payment_proof_submission_id' => $submission->id,
            'transaction_reference' => $submission->transaction_reference,
        ]);
        $this->assertDatabaseCount('rental_payments', 0);
        $this->assertDatabaseCount('service_charge_receipts', 1);
        $this->assertEquals(125, $charge->fresh()->confirmedAmountPaid());
        Mail::assertQueued(PaymentProofReviewedMail::class);
    }

    public function test_rejection_requires_reason_preserves_submission_and_does_not_record_payment(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $submission = $this->rentalSubmission($client);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/reject")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rejection_reason']);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/reject", [
            'rejection_reason' => '  Please provide a readable bank receipt.  ',
        ])->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'Please provide a readable bank receipt.');

        $this->assertDatabaseHas('payment_proof_submissions', [
            'id' => $submission->id,
            'status' => 'rejected',
            'reviewed_by' => $admin->id,
            'rejection_reason' => 'Please provide a readable bank receipt.',
        ]);
        $this->assertDatabaseCount('rental_payments', 0);
        $this->postJson("/api/v1/payment-approvals/{$submission->id}/reject", [
            'rejection_reason' => 'Repeated decision',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['submission']);

        Sanctum::actingAs($client);
        $this->getJson('/api/v1/client/payment-proof-submissions')
            ->assertOk()
            ->assertJsonPath('data.0.status', 'rejected')
            ->assertJsonPath('data.0.rejection_reason', 'Please provide a readable bank receipt.');
        Mail::assertQueued(PaymentProofReviewedMail::class, 1);
    }

    public function test_unique_submission_link_prevents_duplicate_payment_records_after_retry_races(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $period = $this->createPeriod($client);
        $submission = $this->rentalSubmission($client, $period);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")->assertOk();

        $this->expectException(QueryException::class);
        $period->payments()->create([
            'amount' => 50,
            'paid_at' => now(),
            'payment_method' => 'client_proof',
            'transaction_reference' => 'RETRY-RACE-DUPLICATE',
            'status' => RentalPaymentStatus::Confirmed,
            'payment_proof_submission_id' => $submission->id,
        ]);
    }

    public function test_approval_rolls_back_when_submission_is_invalid_or_target_balance_changed(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $period = $this->createPeriod($client);
        $submission = $this->rentalSubmission($client, $period, ['amount' => 800]);
        $period->payments()->create([
            'amount' => 500,
            'paid_at' => now(),
            'payment_method' => 'cash',
            'transaction_reference' => 'ADMIN-RECORDED-01',
            'status' => RentalPaymentStatus::Confirmed,
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);
        $this->assertDatabaseCount('rental_payments', 1);
        $this->assertDatabaseHas('payment_proof_submissions', [
            'id' => $submission->id,
            'status' => 'pending',
            'reviewed_at' => null,
        ]);

        $agreement = $period->rentalAgreement;
        $agreement->update(['status' => 'terminated']);
        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertUnprocessable();
        $this->assertDatabaseCount('rental_payments', 1);
        $this->assertDatabaseHas('payment_proof_submissions', [
            'id' => $submission->id,
            'status' => 'pending',
        ]);
    }

    public function test_existing_payment_reference_prevents_approval_without_mutating_submission(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $period = $this->createPeriod($client);
        $period->payments()->create([
            'amount' => 10,
            'paid_at' => now(),
            'payment_method' => 'cash',
            'transaction_reference' => 'DUPLICATE-REFERENCE',
            'status' => RentalPaymentStatus::Confirmed,
        ]);
        $submission = $this->rentalSubmission($client, $period, [
            'amount' => 100,
            'transaction_reference' => 'DUPLICATE-REFERENCE',
        ]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['transaction_reference']);

        $this->assertDatabaseCount('rental_payments', 1);
        $this->assertDatabaseHas('payment_proof_submissions', [
            'id' => $submission->id,
            'status' => 'pending',
            'reviewed_at' => null,
        ]);
    }

    public function test_approval_rejects_a_submission_for_another_clients_rental_period(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $submittingClient = Client::factory()->create();
        $periodOwner = Client::factory()->create();
        $period = $this->createPeriod($periodOwner);
        $submission = $this->rentalSubmission($submittingClient, $period);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['rental_payment_period_id']);

        $this->assertDatabaseCount('rental_payments', 0);
        $this->assertDatabaseHas('payment_proof_submissions', [
            'id' => $submission->id,
            'status' => 'pending',
        ]);
    }

    public function test_approval_rejects_non_positive_amount_without_recording_payment(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $submission = $this->rentalSubmission($client, null, ['amount' => 0]);
        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/payment-approvals/{$submission->id}/approve")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);

        $this->assertDatabaseCount('rental_payments', 0);
        $this->assertDatabaseHas('payment_proof_submissions', [
            'id' => $submission->id,
            'status' => 'pending',
        ]);
    }

    public function test_admin_evidence_endpoint_rejects_paths_that_escape_the_clients_private_directory(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $client = Client::factory()->create();
        $submission = $this->rentalSubmission($client, null, [
            'proof_of_payment_path' => "payment-proofs/{$client->id}/../other-client/proof.pdf",
        ]);
        Sanctum::actingAs($admin);

        $this->get("/api/v1/payment-approvals/{$submission->id}/proof")->assertNotFound();
    }

    private function createPeriod(Client $client): RentalPaymentPeriod
    {
        $property = RentalProperty::query()->create(['name' => 'Proof Rental']);
        $agreement = $property->agreements()->create([
            'client_id' => $client->id,
            'rental_amount' => 1000,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => now()->startOfMonth()->toDateString(),
            'lease_end_date' => now()->addYear()->endOfMonth()->toDateString(),
            'status' => 'active',
        ]);
        app(RentalPaymentScheduleService::class)->ensurePeriods($agreement);

        return $agreement->paymentPeriods()->orderBy('period_start')->firstOrFail();
    }

    private function createServiceCharge(Client $client): ServiceCharge
    {
        $property = RentalProperty::query()->create(['name' => 'Proof Service Property']);
        $agreement = $property->agreements()->create([
            'client_id' => $client->id,
            'rental_amount' => 1000,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => now()->startOfMonth()->toDateString(),
            'lease_end_date' => now()->addYear()->endOfMonth()->toDateString(),
            'status' => 'active',
        ]);

        return ServiceCharge::query()->create([
            'category_id' => ServiceChargeCategory::query()->where('name', 'Security')->value('id'),
            'rental_agreement_id' => $agreement->id,
            'rental_property_id' => $property->id,
            'client_id' => $client->id,
            'description' => 'Security',
            'billing_period_start' => now()->startOfMonth()->toDateString(),
            'billing_period_end' => now()->endOfMonth()->toDateString(),
            'billing_date' => now()->startOfMonth()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'amount_due' => 500,
        ]);
    }

    private function rentalSubmission(
        Client $client,
        ?RentalPaymentPeriod $period = null,
        array $overrides = []
    ): PaymentProofSubmission {
        $period ??= $this->createPeriod($client);

        return $this->submission($client, [
            'payment_category' => 'rental',
            'rental_payment_period_id' => $period->id,
            'service_charge_id' => null,
        ], $overrides);
    }

    private function serviceChargeSubmission(
        Client $client,
        ServiceCharge $charge,
        array $overrides = []
    ): PaymentProofSubmission {
        return $this->submission($client, [
            'payment_category' => 'service_charge',
            'rental_payment_period_id' => null,
            'service_charge_id' => $charge->id,
        ], $overrides);
    }

    private function submission(Client $client, array $attributes, array $overrides = []): PaymentProofSubmission
    {
        $defaults = [
            'amount' => 125,
            'paid_at' => now()->subDay()->toDateString(),
            'transaction_reference' => 'PROOF-REF-'.$client->id.'-'.random_int(1000, 9999),
            'proof_of_payment_path' => "payment-proofs/{$client->id}/proof.pdf",
            'status' => PaymentProofSubmissionStatus::Pending,
        ];

        return PaymentProofSubmission::query()->create(array_replace($defaults, $attributes, $overrides, [
            'client_id' => $client->id,
        ]));
    }
}
