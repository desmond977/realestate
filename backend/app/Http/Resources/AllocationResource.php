<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AllocationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'client_id' => $this->client_id,
            'total_amount' => (float) $this->total_amount,
            'amount_paid' => (float) $this->amount_paid,
            'balance' => (float) $this->balance,
            'payment_plan' => $this->payment_plan?->value ?? $this->payment_plan,
            'status' => $this->status?->value ?? $this->status,
            'allocated_at' => $this->allocated_at?->toDateString(),
            'notes' => $this->notes,
            'client' => new ClientResource($this->whenLoaded('client')),
            'property' => new PropertyResource($this->whenLoaded('property')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'allocated_by' => new UserResource($this->whenLoaded('allocator')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
