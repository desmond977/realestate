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
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_dashboard(): void
    {
        $this->getJson('/api/v1/dashboard')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_fetch_dashboard_analytics(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $client = Client::factory()->create();
        $availableProperty = Property::factory()->create(['status' => PropertyStatus::Available]);
        $reservedProperty = Property::factory()->create(['status' => PropertyStatus::Reserved]);
        $soldProperty = Property::factory()->create(['status' => PropertyStatus::Sold]);

        $activeAllocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $reservedProperty->id,
            'total_amount' => 10000000,
            'amount_paid' => 3000000,
            'balance' => 7000000,
            'payment_plan' => PaymentPlan::Installment,
            'status' => AllocationStatus::Active,
            'allocated_at' => now()->subDay(),
        ]);

        Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $soldProperty->id,
            'total_amount' => 5000000,
            'amount_paid' => 5000000,
            'balance' => 0,
            'payment_plan' => PaymentPlan::Full,
            'status' => AllocationStatus::Completed,
            'allocated_at' => now(),
        ]);

        $confirmedPayment = Payment::factory()->create([
            'allocation_id' => $activeAllocation->id,
            'client_id' => $client->id,
            'property_id' => $reservedProperty->id,
            'amount' => 3000000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => now(),
        ]);

        Payment::factory()->create([
            'allocation_id' => $activeAllocation->id,
            'client_id' => $client->id,
            'property_id' => $reservedProperty->id,
            'amount' => 2000000,
            'status' => PaymentStatus::Failed,
            'paid_at' => now()->subHour(),
        ]);

        Receipt::factory()->create([
            'payment_id' => $confirmedPayment->id,
            'receipt_number' => 'REC-DASHBOARD-001',
        ]);

        $response = $this->getJson('/api/v1/dashboard');

        $response
            ->assertOk()
            ->assertJsonPath('data.stats.total_properties', 3)
            ->assertJsonPath('data.stats.available_properties', 1)
            ->assertJsonPath('data.stats.reserved_properties', 1)
            ->assertJsonPath('data.stats.sold_properties', 1)
            ->assertJsonPath('data.stats.total_clients', 1)
            ->assertJsonPath('data.stats.revenue', 3000000)
            ->assertJsonPath('data.stats.outstanding_balances', 7000000)
            ->assertJsonPath('data.stats.active_allocations', 1)
            ->assertJsonPath('data.stats.completed_allocations', 1)
            ->assertJsonPath('data.property_status_breakdown.0.status', 'available')
            ->assertJsonPath('data.recent_payments.0.receipt.receipt_number', 'REC-DASHBOARD-001')
            ->assertJsonCount(3, 'data.property_status_breakdown')
            ->assertJsonCount(3, 'data.allocation_status_breakdown');

        $this->assertDatabaseHas('properties', [
            'id' => $availableProperty->id,
            'status' => 'available',
        ]);
    }
}
