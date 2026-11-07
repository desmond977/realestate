<?php

namespace Tests\Feature;

use App\Enums\RentalFrequency;
use App\Enums\RentalPaymentStatus;
use App\Enums\PaymentProofSubmissionStatus;
use App\Models\Client;
use App\Models\PaymentProofSubmission;
use App\Models\RentalAgreement;
use App\Models\RentalPaymentPeriod;
use App\Models\RentalProperty;
use App\Models\ServiceCharge;
use App\Models\ServiceChargeCategory;
use App\Models\User;
use App\Services\RealEstate\RentalPaymentScheduleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ClientPaymentProofSubmissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_guest_and_operations_users_cannot_access_client_proof_submissions(): void
    {
        $this->getJson('/api/v1/client/payment-proof-submissions')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->getJson('/api/v1/client/payment-proof-submissions')->assertForbidden();
    }

    public function test_client_can_submit_rental_proof_without_changing_confirmed_payment_records(): void
    {
        $client = Client::factory()->create();
        $period = $this->createPeriod($client);
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/v1/client/payment-proof-submissions', [
            'payment_category' => 'rental',
            'rental_payment_period_id' => $period->id,
            'amount' => 300,
            'paid_at' => now()->subDay()->toDateString(),
            'transaction_reference' => 'CLIENT-RENT-001',
            'proof_of_payment' => $this->pngFile('transfer.png'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.payment_category', 'rental')
            ->assertJsonPath('data.amount', 300)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.rental_payment_period.id', $period->id);

        $submission = PaymentProofSubmission::query()->firstOrFail();
        $this->assertSame($client->id, $submission->client_id);
        Storage::disk('local')->assertExists($submission->proof_of_payment_path);
        $this->assertSame(0.0, $period->confirmedAmountPaid());
        $this->assertDatabaseCount('rental_payments', 0);
        $this->assertDatabaseCount('service_charge_payments', 0);
        $options = $this->getJson('/api/v1/client/payment-proof-submissions/options')->assertOk();
        $selectedPeriod = collect($options->json('data.rental_payment_periods'))
            ->firstWhere('id', $period->id);
        $this->assertEquals(700, $selectedPeriod['available_amount']);

        $this->getJson("/api/v1/client/payment-proof-submissions/{$submission->id}/proof")
            ->assertOk();
    }

    public function test_client_can_submit_service_charge_proof_and_view_rejection_history(): void
    {
        $client = Client::factory()->create();
        $charge = $this->createServiceCharge($client);
        Sanctum::actingAs($client);

        $response = $this->postJson('/api/v1/client/payment-proof-submissions', [
            'payment_category' => 'service_charge',
            'service_charge_id' => $charge->id,
            'amount' => 125,
            'paid_at' => now()->toDateString(),
            'transaction_reference' => 'CLIENT-SC-001',
            'proof_of_payment' => UploadedFile::fake()->createWithContent('receipt.pdf', "%PDF-1.4\nproof"),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.payment_category', 'service_charge')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.service_charge.id', $charge->id);

        $submission = PaymentProofSubmission::query()->firstOrFail();
        $submission->update([
            'status' => PaymentProofSubmissionStatus::Rejected,
            'rejection_reason' => 'The receipt does not show the transaction reference.',
        ]);

        $this->getJson('/api/v1/client/payment-proof-submissions')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'rejected')
            ->assertJsonPath('data.0.rejection_reason', 'The receipt does not show the transaction reference.')
            ->assertJsonPath('data.0.service_charge.id', $charge->id);
        $this->assertDatabaseCount('service_charge_payments', 0);
    }

    public function test_client_cannot_submit_for_another_clients_rental_or_service_charge(): void
    {
        $owner = Client::factory()->create();
        $otherClient = Client::factory()->create();
        $period = $this->createPeriod($owner);
        $charge = $this->createServiceCharge($owner);
        Sanctum::actingAs($otherClient);
        $this->getJson('/api/v1/client/payment-proof-submissions/options')
            ->assertOk()
            ->assertJsonCount(0, 'data.rental_payment_periods')
            ->assertJsonCount(0, 'data.service_charges');

        $this->postJson('/api/v1/client/payment-proof-submissions', [
            'payment_category' => 'rental',
            'rental_payment_period_id' => $period->id,
            'amount' => 100,
            'paid_at' => now()->toDateString(),
            'transaction_reference' => 'UNAUTHORIZED-RENT',
            'proof_of_payment' => $this->pngFile('proof.png'),
        ])->assertNotFound();

        $this->postJson('/api/v1/client/payment-proof-submissions', [
            'payment_category' => 'service_charge',
            'service_charge_id' => $charge->id,
            'amount' => 100,
            'paid_at' => now()->toDateString(),
            'transaction_reference' => 'UNAUTHORIZED-SC',
            'proof_of_payment' => $this->pngFile('proof.png'),
        ])->assertNotFound();

        $this->assertDatabaseCount('payment_proof_submissions', 0);
    }

    public function test_submissions_enforce_balance_duplicate_reference_and_file_validation(): void
    {
        $client = Client::factory()->create();
        $period = $this->createPeriod($client);
        Sanctum::actingAs($client);
        $payload = [
            'payment_category' => 'rental',
            'rental_payment_period_id' => $period->id,
            'amount' => 700,
            'paid_at' => now()->toDateString(),
            'transaction_reference' => 'CLIENT-RENT-DUP',
            'proof_of_payment' => $this->pngFile('proof.png'),
        ];

        $this->postJson('/api/v1/client/payment-proof-submissions', $payload)->assertCreated();
        $this->postJson('/api/v1/client/payment-proof-submissions', array_replace($payload, [
            'amount' => 301,
            'transaction_reference' => 'CLIENT-RENT-OVER',
            'proof_of_payment' => $this->pngFile('proof-2.png'),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['amount']);
        $this->postJson('/api/v1/client/payment-proof-submissions', array_replace($payload, [
            'amount' => 100,
            'proof_of_payment' => $this->pngFile('proof-3.png'),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['transaction_reference']);
        $period->payments()->create([
            'amount' => 100,
            'paid_at' => now(),
            'payment_method' => 'bank_transfer',
            'transaction_reference' => 'ALREADY-RECORDED',
            'status' => RentalPaymentStatus::Confirmed,
        ]);
        $this->postJson('/api/v1/client/payment-proof-submissions', array_replace($payload, [
            'amount' => 100,
            'transaction_reference' => 'ALREADY-RECORDED',
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['transaction_reference']);
        $this->postJson('/api/v1/client/payment-proof-submissions', array_replace($payload, [
            'transaction_reference' => 'CLIENT-RENT-EXE',
            'proof_of_payment' => UploadedFile::fake()->create('malware.exe', 100, 'application/x-msdownload'),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['proof_of_payment']);
        $this->postJson('/api/v1/client/payment-proof-submissions', array_replace($payload, [
            'transaction_reference' => 'CLIENT-RENT-LARGE',
            'proof_of_payment' => UploadedFile::fake()->createWithContent(
                'large.pdf',
                "%PDF-1.4\n".str_repeat(' ', 5 * 1024 * 1024)
            ),
        ]))->assertUnprocessable()
            ->assertJsonValidationErrors(['proof_of_payment']);

        $this->assertDatabaseCount('payment_proof_submissions', 1);
        $this->assertDatabaseCount('rental_payments', 1);
    }

    public function test_client_cannot_download_another_clients_evidence(): void
    {
        $owner = Client::factory()->create();
        $other = Client::factory()->create();
        $period = $this->createPeriod($owner);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/client/payment-proof-submissions', [
            'payment_category' => 'rental',
            'rental_payment_period_id' => $period->id,
            'amount' => 100,
            'paid_at' => now()->toDateString(),
            'transaction_reference' => 'OWNER-PRIVATE-FILE',
            'proof_of_payment' => $this->pngFile('private.png'),
        ])->assertCreated();
        $submission = PaymentProofSubmission::query()->firstOrFail();

        Sanctum::actingAs($other);
        $this->getJson('/api/v1/client/payment-proof-submissions')
            ->assertOk()
            ->assertJsonCount(0, 'data');
        $this->getJson("/api/v1/client/payment-proof-submissions/{$submission->id}/proof")
            ->assertNotFound();
    }

    private function createPeriod(Client $client): RentalPaymentPeriod
    {
        $property = RentalProperty::query()->create(['name' => 'Client rental']);
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
        $property = RentalProperty::query()->create(['name' => 'Client service charge property']);
        $agreement = $property->agreements()->create([
            'client_id' => $client->id,
            'rental_amount' => 1000,
            'rental_frequency' => RentalFrequency::Monthly,
            'lease_start_date' => now()->startOfMonth()->toDateString(),
            'lease_end_date' => now()->addYear()->endOfMonth()->toDateString(),
            'status' => 'active',
        ]);

        return ServiceCharge::query()->create([
            'category_id' => ServiceChargeCategory::query()->value('id'),
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

    private function pngFile(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jg8sAAAAASUVORK5CYII=')
        );
    }
}
