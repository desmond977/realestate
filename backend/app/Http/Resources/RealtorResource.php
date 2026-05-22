<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RealtorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'company_name' => $this->company_name,
            'profile_image' => $this->profile_image,
            'status' => $this->status,
            'clients_count' => $this->whenCounted('clients'),
            'allocations_count' => $this->whenCounted('allocations'),
            'payments_count' => $this->whenCounted('payments'),
            'monthly_clients_count' => $this->when(
                array_key_exists('monthly_clients_count', $this->resource->getAttributes()),
                (int) ($this->monthly_clients_count ?? 0)
            ),
            'confirmed_revenue' => $this->when(
                array_key_exists('confirmed_revenue', $this->resource->getAttributes()),
                (float) ($this->confirmed_revenue ?? 0)
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
