<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Enums\RentalStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PropertyResource;
use App\Models\RentalAgreement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RentalPropertyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $agreements = RentalAgreement::query()
            ->where('client_id', $request->user()->id)
            ->where('status', RentalStatus::Active->value)
            ->whereHas('rentalProperty')
            ->with(['rentalProperty.property', 'client'])
            ->orderByDesc('lease_start_date')
            ->get();

        return response()->json([
            'data' => [
                'properties' => $agreements->map(function (RentalAgreement $agreement) {
                    $rentalProperty = $agreement->rentalProperty;
                    $property = $rentalProperty->property;

                    return [
                        'rental_id' => $agreement->id,
                        'status' => $agreement->status?->value ?? $agreement->status,
                        'rental_amount' => (float) $agreement->rental_amount,
                        'rental_frequency' => $agreement->rental_frequency?->value ?? $agreement->rental_frequency,
                        'lease_start_date' => $agreement->lease_start_date?->toDateString(),
                        'lease_end_date' => $agreement->lease_end_date?->toDateString(),
                        'rental_property' => [
                            'id' => $rentalProperty->id,
                            'name' => $rentalProperty->name ?: $property?->title ?: 'Rental property',
                            'location' => $rentalProperty->location ?: $property?->location,
                            'description' => $rentalProperty->description ?: $property?->description,
                            'property' => $property ? new PropertyResource($property) : null,
                        ],
                        'tenant' => $agreement->client ? [
                            'id' => $agreement->client->id,
                            'full_name' => $agreement->client->full_name,
                        ] : null,
                    ];
                })->values(),
                'total' => $agreements->count(),
            ],
        ]);
    }
}
