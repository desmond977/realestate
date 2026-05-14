<?php

namespace Database\Factories;

use App\Models\Payment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Receipt>
 */
class ReceiptFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'payment_id' => Payment::factory(),
            'issued_by' => User::factory(),
            'receipt_number' => 'REC-'.now()->format('Ymd').'-'.fake()->unique()->numerify('######'),
            'issued_at' => now(),
            'metadata' => [
                'channel' => 'system',
            ],
        ];
    }
}
