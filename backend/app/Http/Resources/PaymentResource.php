<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'allocation_id' => $this->allocation_id,
            'property_id' => $this->property_id,
            'client_id' => $this->client_id,
            'amount' => (float) $this->amount,
            'payment_type' => $this->payment_type?->value ?? $this->payment_type,
            'payment_method' => $this->payment_method,
            'status' => $this->status?->value ?? $this->status,
            'transaction_reference' => $this->transaction_reference,
            'paid_at' => $this->paid_at?->toISOString(),
            'notes' => $this->notes,
            'client' => new ClientResource($this->whenLoaded('client')),
            'property' => new PropertyResource($this->whenLoaded('property')),
            'receipt' => new ReceiptResource($this->whenLoaded('receipt')),
            'recorded_by' => new UserResource($this->whenLoaded('recorder')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
