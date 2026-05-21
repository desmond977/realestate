<?php

namespace Database\Factories;

use App\Enums\PropertyStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Property>
 */
class PropertyFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->streetName().' Estate Plot',
            'type' => fake()->randomElement(['land', 'apartment', 'duplex', 'bungalow']),
            'location' => fake()->city(),
            'price' => fake()->randomFloat(2, 5000000, 150000000),
            'status' => PropertyStatus::Available->value,
            'description' => fake()->paragraph(),
            'land_size' => fake()->randomElement(['500 SQM', '1 Plot', '2 Hectares']),
            'document_type' => fake()->randomElement(['C of O', 'Allocation Letter', 'Deed of Assignment', 'Receipt', 'Survey Plan']),
            'image' => null,
        ];
    }
}
