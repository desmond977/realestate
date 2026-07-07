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
            'realtor_id' => $this->realtor_id,
            'total_amount' => (float) $this->total_amount,
            'amount_paid' => (float) $this->amount_paid,
            'balance' => (float) $this->balance,
            'payment_plan' => $this->payment_plan?->value ?? $this->payment_plan,
            'payment_duration' => $this->payment_duration,
            'custom_duration_value' => $this->custom_duration_value,
            'custom_duration_unit' => $this->custom_duration_unit,
            'payment_duration_label' => $this->paymentDurationLabel(),
            'payment_duration_interval' => $this->paymentDurationInterval(),
            'status' => $this->status?->value ?? $this->status,
            'allocated_at' => $this->allocated_at?->toDateString(),
            'notes' => $this->notes,
            'payment_screenshot' => $this->payment_screenshot ? asset('storage/' . $this->payment_screenshot) : null,
            'client' => new ClientResource($this->whenLoaded('client')),
            'realtor' => new RealtorResource($this->whenLoaded('realtor')),
            'property' => new PropertyResource($this->whenLoaded('property')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'allocated_by' => new UserResource($this->whenLoaded('allocator')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
