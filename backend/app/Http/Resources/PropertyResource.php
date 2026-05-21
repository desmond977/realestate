<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class PropertyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type,
            'location' => $this->location,
            'price' => (float) $this->price,
            'status' => $this->status?->value ?? $this->status,
            'description' => $this->description,
            'land_size' => $this->land_size,
            'document_type' => $this->document_type,
            'image' => $this->image,
            'image_url' => $this->image ? (
                filter_var($this->image, FILTER_VALIDATE_URL)
                    ? $this->image
                    : Storage::disk('public')->url($this->image)
            ) : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
