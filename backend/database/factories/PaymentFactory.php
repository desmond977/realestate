<?php

namespace Database\Factories;

use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payment>
 */
class PaymentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'allocation_id' => Allocation::factory(),
            'property_id' => Property::factory(),
            'client_id' => Client::factory(),
            'recorded_by' => User::factory(),
            'amount' => fake()->randomFloat(2, 100000, 10000000),
            'payment_type' => PaymentPlan::Installment->value,
            'payment_method' => fake()->randomElement(['bank_transfer', 'cash', 'pos', 'cheque']),
            'status' => PaymentStatus::Confirmed->value,
            'transaction_reference' => 'TXN-'.Str::upper(Str::random(12)),
            'paid_at' => now(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
