<?php

namespace Database\Factories;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Models\Client;
use App\Models\Property;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Allocation>
 */
class AllocationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $totalAmount = fake()->randomFloat(2, 5000000, 150000000);
        $amountPaid = fake()->randomFloat(2, 0, $totalAmount);

        return [
            'property_id' => Property::factory(),
            'client_id' => Client::factory(),
            'realtor_id' => null,
            'allocated_by' => User::factory(),
            'total_amount' => $totalAmount,
            'amount_paid' => $amountPaid,
            'balance' => $totalAmount - $amountPaid,
            'payment_plan' => PaymentPlan::Installment->value,
            'status' => AllocationStatus::Active->value,
            'allocated_at' => fake()->date(),
            'notes' => fake()->optional()->sentence(),
        ];
    }
}
