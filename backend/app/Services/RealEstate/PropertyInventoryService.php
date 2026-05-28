<?php

namespace App\Services\RealEstate;

use App\Enums\PropertyStatus;
use App\Models\Property;

class PropertyInventoryService
{
    public function reserveOne(Property $property): Property
    {
        $property->forceFill([
            'available_count' => max($property->available_count - 1, 0),
            'reserved_count' => $property->reserved_count + 1,
        ]);

        return $this->saveWithStatus($property);
    }

    public function releaseReservation(Property $property): Property
    {
        $property->forceFill([
            'available_count' => $property->available_count + 1,
            'reserved_count' => max($property->reserved_count - 1, 0),
        ]);

        return $this->saveWithStatus($property);
    }

    public function sellReserved(Property $property): Property
    {
        $property->forceFill([
            'reserved_count' => max($property->reserved_count - 1, 0),
            'sold_count' => $property->sold_count + 1,
        ]);

        return $this->saveWithStatus($property);
    }

    private function saveWithStatus(Property $property): Property
    {
        $property->status = match (true) {
            $property->property_count > 0 && $property->sold_count >= $property->property_count => PropertyStatus::Sold,
            $property->reserved_count > 0 => PropertyStatus::Reserved,
            default => PropertyStatus::Available,
        };

        $property->save();

        return $property;
    }
}
