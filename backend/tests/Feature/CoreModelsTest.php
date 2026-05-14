<?php

namespace Tests\Feature;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoreModelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_core_real_estate_models_persist_with_relationships(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $property = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $client = Client::factory()->create();

        $allocation = Allocation::factory()->create([
            'property_id' => $property->id,
            'client_id' => $client->id,
            'allocated_by' => $user->id,
            'total_amount' => 10000000,
            'amount_paid' => 2500000,
            'balance' => 7500000,
            'payment_plan' => PaymentPlan::Installment,
            'status' => AllocationStatus::Active,
        ]);

        $payment = Payment::factory()->create([
            'allocation_id' => $allocation->id,
            'property_id' => $property->id,
            'client_id' => $client->id,
            'recorded_by' => $user->id,
            'amount' => 2500000,
            'payment_type' => PaymentPlan::Installment,
            'status' => PaymentStatus::Confirmed,
        ]);

        $receipt = Receipt::factory()->create([
            'payment_id' => $payment->id,
            'issued_by' => $user->id,
        ]);

        $this->assertTrue($property->allocations()->whereKey($allocation)->exists());
        $this->assertTrue($client->payments()->whereKey($payment)->exists());
        $this->assertTrue($allocation->payments()->whereKey($payment)->exists());
        $this->assertTrue($payment->receipt()->whereKey($receipt)->exists());
        $this->assertSame('admin', $user->role->value);
        $this->assertSame('reserved', $property->status->value);
        $this->assertSame('active', $allocation->status->value);
    }
}
