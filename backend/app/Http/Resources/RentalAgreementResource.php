<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RentalAgreementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $rentalProperty = $this->whenLoaded('rentalProperty');
        $property = $rentalProperty?->property;

        return [
            'id' => $this->id,
            'rental_amount' => (float) $this->rental_amount,
            'rental_frequency' => $this->rental_frequency?->value ?? $this->rental_frequency,
            'lease_start_date' => $this->lease_start_date?->toDateString(),
            'lease_end_date' => $this->lease_end_date?->toDateString(),
            'status' => $this->status?->value ?? $this->status,
            'notes' => $this->notes,
            'rental_property' => $rentalProperty ? [
                'id' => $rentalProperty->id,
                'property_id' => $rentalProperty->property_id,
                'name' => $rentalProperty->name,
                'location' => $rentalProperty->location,
                'description' => $rentalProperty->description,
                'property' => $property ? [
                    'id' => $property->id,
                    'title' => $property->title,
                    'type' => $property->type,
                    'location' => $property->location,
                    'image' => $property->image,
                ] : null,
            ] : null,
            'client' => $this->whenLoaded('client', fn () => [
                'id' => $this->client->id,
                'full_name' => $this->client->full_name,
                'email' => $this->client->email,
                'phone' => $this->client->phone,
                'address' => $this->client->address,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
