<?php

namespace Tests\Feature;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use App\Enums\PropertyStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\CompanySetting;
use App\Models\Payment;
use App\Models\Property;
use App\Models\Realtor;
use App\Models\RealtorLeaderboardSnapshot;
use App\Models\Receipt;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_target_progress_uses_only_revenue_from_the_current_month(): void
    {
        Cache::flush();
        Carbon::setTestNow(Carbon::parse('2026-10-15 12:00:00'));
        Sanctum::actingAs(User::factory()->create());

        CompanySetting::query()->create([
            'target_type' => 'monthly',
            'target_amount' => 1000000,
        ]);
        app(\App\Services\CompanySettings::class)->forget();

        $previousMonthPayment = Payment::factory()->create([
            'amount' => 900000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => Carbon::parse('2026-09-30 23:59:59'),
        ]);
        $currentMonthPayment = Payment::factory()->create([
            'amount' => 250000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => Carbon::parse('2026-10-01 00:00:00'),
        ]);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.stats.revenue', 1150000)
            ->assertJsonPath('data.stats.monthly_revenue', 250000)
            ->assertJsonPath('data.monthly_target', 1000000)
            ->assertJsonPath('data.target_revenue', 250000)
            ->assertJsonPath('data.monthly_target_progress', 25);

        Carbon::setTestNow();
    }

    public function test_weekly_target_progress_uses_only_revenue_from_monday_through_sunday(): void
    {
        Cache::flush();
        Carbon::setTestNow(Carbon::parse('2026-10-15 12:00:00'));
        Sanctum::actingAs(User::factory()->create());

        CompanySetting::query()->create([
            'target_type' => 'weekly',
            'target_amount' => 500000,
        ]);
        app(\App\Services\CompanySettings::class)->forget();

        Payment::factory()->create([
            'amount' => 900000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => Carbon::parse('2026-10-11 23:59:59'),
        ]);
        Payment::factory()->create([
            'amount' => 250000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => Carbon::parse('2026-10-12 00:00:00'),
        ]);
        Payment::factory()->create([
            'amount' => 350000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => Carbon::parse('2026-10-19 00:00:00'),
        ]);

        $this->getJson('/api/v1/dashboard')
            ->assertOk()
            ->assertJsonPath('data.target_type', 'weekly')
            ->assertJsonPath('data.target_amount', 500000)
            ->assertJsonPath('data.target_revenue', 250000)
            ->assertJsonPath('data.target_progress', 50);

        Carbon::setTestNow();
    }

    public function test_guest_cannot_access_dashboard(): void
    {
        $this->getJson('/api/v1/dashboard')
            ->assertUnauthorized();
    }

    public function test_authenticated_user_can_fetch_dashboard_analytics(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $topRealtor = Realtor::factory()->create(['full_name' => 'Top Realtor']);
        $secondRealtor = Realtor::factory()->create(['full_name' => 'Second Realtor']);
        $client = Client::factory()->create(['realtor_id' => $topRealtor->id]);
        Client::factory()->count(2)->create([
            'realtor_id' => $topRealtor->id,
            'created_at' => now()->subDays(2),
        ]);
        Client::factory()->create([
            'realtor_id' => $secondRealtor->id,
            'created_at' => now()->subDays(3),
        ]);
        Client::factory()->create([
            'realtor_id' => $secondRealtor->id,
            'created_at' => now()->subMonths(2),
        ]);
        $availableProperty = Property::factory()->create([
            'status' => PropertyStatus::Available,
            'property_count' => 10,
            'available_count' => 10,
            'reserved_count' => 0,
            'sold_count' => 0,
        ]);
        $reservedProperty = Property::factory()->create([
            'status' => PropertyStatus::Reserved,
            'property_count' => 8,
            'available_count' => 5,
            'reserved_count' => 3,
            'sold_count' => 0,
        ]);
        $soldProperty = Property::factory()->create([
            'status' => PropertyStatus::Sold,
            'property_count' => 4,
            'available_count' => 0,
            'reserved_count' => 0,
            'sold_count' => 4,
        ]);

        $activeAllocation = Allocation::factory()->create([
            'client_id' => $client->id,
            'property_id' => $reservedProperty->id,
            'realtor_id' => $topRealtor->id,
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
            'realtor_id' => $topRealtor->id,
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
            'realtor_id' => $topRealtor->id,
            'amount' => 3000000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => now(),
        ]);

        Payment::factory()->create([
            'allocation_id' => $activeAllocation->id,
            'client_id' => $client->id,
            'property_id' => $reservedProperty->id,
            'realtor_id' => $topRealtor->id,
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
            ->assertJsonPath('data.stats.total_plots', 22)
            ->assertJsonPath('data.stats.available_plots', 15)
            ->assertJsonPath('data.stats.reserved_plots', 3)
            ->assertJsonPath('data.stats.sold_plots', 4)
            ->assertJsonPath('data.stats.total_clients', 5)
            ->assertJsonPath('data.stats.revenue', 3000000)
            ->assertJsonPath('data.stats.outstanding_balances', 7000000)
            ->assertJsonPath('data.stats.active_allocations', 1)
            ->assertJsonPath('data.stats.completed_allocations', 1)
            ->assertJsonPath('data.property_status_breakdown.0.status', 'available')
            ->assertJsonPath('data.top_realtors.0.full_name', 'Top Realtor')
            ->assertJsonPath('data.top_realtors.0.properties_sold_count', 1)
            ->assertJsonPath('data.top_realtors.0.confirmed_revenue', 3000000)
            ->assertJsonPath('data.top_realtors.0.outstanding_balances', 7000000)
            ->assertJsonPath('data.recent_payments.0.receipt.receipt_number', 'REC-DASHBOARD-001')
            ->assertJsonCount(3, 'data.property_status_breakdown')
            ->assertJsonCount(3, 'data.property_inventory_breakdown')
            ->assertJsonCount(4, 'data.allocation_status_breakdown');

        $this->assertDatabaseHas('properties', [
            'id' => $availableProperty->id,
            'status' => 'available',
        ]);
    }
    public function test_dashboard_uses_current_month_realtor_leaderboard_and_archives_previous_month(): void
    {
        Cache::flush();
        Carbon::setTestNow(Carbon::parse('2026-08-20 09:00:00'));
        Sanctum::actingAs(User::factory()->create());

        $julyLeader = Realtor::factory()->create(['full_name' => 'July Leader']);
        $augustLeader = Realtor::factory()->create(['full_name' => 'August Leader']);
        $julyClient = Client::factory()->create(['realtor_id' => $julyLeader->id]);
        $augustClient = Client::factory()->create(['realtor_id' => $augustLeader->id]);
        $property = Property::factory()->create();

        $julyAllocation = Allocation::factory()->create([
            'client_id' => $julyClient->id,
            'property_id' => $property->id,
            'realtor_id' => $julyLeader->id,
            'total_amount' => 4000000,
            'amount_paid' => 4000000,
            'balance' => 0,
            'status' => AllocationStatus::Completed,
            'allocated_at' => Carbon::parse('2026-07-12'),
            'created_at' => Carbon::parse('2026-07-12'),
            'updated_at' => Carbon::parse('2026-07-12'),
        ]);

        Payment::factory()->create([
            'allocation_id' => $julyAllocation->id,
            'client_id' => $julyClient->id,
            'property_id' => $property->id,
            'realtor_id' => $julyLeader->id,
            'amount' => 4000000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => Carbon::parse('2026-07-12'),
        ]);

        $augustAllocation = Allocation::factory()->create([
            'client_id' => $augustClient->id,
            'property_id' => $property->id,
            'realtor_id' => $augustLeader->id,
            'total_amount' => 7000000,
            'amount_paid' => 7000000,
            'balance' => 0,
            'status' => AllocationStatus::Completed,
            'allocated_at' => Carbon::parse('2026-08-08'),
            'created_at' => Carbon::parse('2026-08-08'),
            'updated_at' => Carbon::parse('2026-08-08'),
        ]);

        Payment::factory()->create([
            'allocation_id' => $augustAllocation->id,
            'client_id' => $augustClient->id,
            'property_id' => $property->id,
            'realtor_id' => $augustLeader->id,
            'amount' => 7000000,
            'status' => PaymentStatus::Confirmed,
            'paid_at' => Carbon::parse('2026-08-08'),
        ]);

        $response = $this->getJson('/api/v1/dashboard');

        $response
            ->assertOk()
            ->assertJsonPath('data.realtor_leaderboard_period.key', '2026-08')
            ->assertJsonPath('data.top_realtors.0.full_name', 'August Leader')
            ->assertJsonPath('data.top_realtors.0.monthly_properties_sold_count', 1)
            ->assertJsonPath('data.top_realtors.0.monthly_confirmed_revenue', 7000000)
            ->assertJsonMissingPath('data.top_realtors.1');

        $snapshot = RealtorLeaderboardSnapshot::query()
            ->whereDate('leaderboard_month', '2026-07-01')
            ->first();

        $this->assertNotNull($snapshot);
        $this->assertSame(1, $snapshot->entries_count);
        $this->assertSame('July Leader', $snapshot->leaderboard[0]['full_name']);
        $this->assertEquals(4000000.0, $snapshot->leaderboard[0]['monthly_confirmed_revenue']);

        Carbon::setTestNow();
    }
}
