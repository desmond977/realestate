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
            'property_count' => (int) $this->property_count,
            'available_count' => (int) $this->available_count,
            'reserved_count' => (int) $this->reserved_count,
            'sold_count' => (int) $this->sold_count,
            'status' => $this->status?->value ?? $this->status,
            'description' => $this->description,
            'land_size' => $this->land_size,
            'document_type' => $this->document_type,
            'image' => $this->image,
            'image_url' => $this->image ? $this->resolvePublicImageUrl($this->image) : $this->getDefaultImageUrl(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function getDefaultImageUrl(): string
    {
        $baseUrl = config('app.url');
        $baseUrl = rtrim($baseUrl, '/');

        return $baseUrl . '/assets/property-placeholder.svg';
    }

    private function resolvePublicImageUrl(string $path): string
    {
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        $storageUrl = Storage::disk('public')->url($path);

        if (filter_var($storageUrl, FILTER_VALIDATE_URL)) {
            return $storageUrl;
        }

        return rtrim(config('app.url'), '/') . '/' . ltrim($storageUrl, '/');
    }
}
