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
            'properties_sold_count' => $this->when(
                array_key_exists('properties_sold_count', $this->resource->getAttributes()),
                (int) ($this->properties_sold_count ?? 0)
            ),
            'monthly_properties_sold_count' => $this->when(
                array_key_exists('monthly_properties_sold_count', $this->resource->getAttributes()),
                (int) ($this->monthly_properties_sold_count ?? 0)
            ),
            'payments_count' => $this->whenCounted('payments'),
            'monthly_clients_count' => $this->when(
                array_key_exists('monthly_clients_count', $this->resource->getAttributes()),
                (int) ($this->monthly_clients_count ?? 0)
            ),
            'confirmed_revenue' => $this->when(
                array_key_exists('confirmed_revenue', $this->resource->getAttributes()),
                (float) ($this->confirmed_revenue ?? 0)
            ),
            'outstanding_balances' => $this->when(
                array_key_exists('outstanding_balances', $this->resource->getAttributes()),
                (float) ($this->outstanding_balances ?? 0)
            ),
            'installment_totals' => $this->when(
                array_key_exists('installment_totals', $this->resource->getAttributes()),
                (float) ($this->installment_totals ?? 0)
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
