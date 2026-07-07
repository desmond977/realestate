<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReceiptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receipt_number' => $this->receipt_number,
            'issued_at' => $this->issued_at?->toISOString(),
            'metadata' => $this->metadata,
            'snapshot' => $this->snapshot,
            'payment' => new PaymentResource($this->whenLoaded('payment')),
            'issued_by' => new UserResource($this->whenLoaded('issuer')),
        ];
    }
}
