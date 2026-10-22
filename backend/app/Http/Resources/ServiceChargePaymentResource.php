<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceChargePaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => (float) $this->amount,
            'paid_at' => $this->paid_at?->toISOString(),
            'payment_method' => $this->payment_method,
            'transaction_reference' => $this->transaction_reference,
            'status' => $this->status?->value ?? $this->status,
            'proof_of_payment_path' => $this->proof_of_payment_path,
            'submitted_at' => $this->submitted_at?->toISOString(),
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at?->toISOString(),
            'approval_notes' => $this->approval_notes,
            'notes' => $this->notes,
            'recorder' => $this->whenLoaded('recorder', fn () => [
                'id' => $this->recorder?->id,
                'name' => $this->recorder?->name,
            ]),
            'receipt' => $this->whenLoaded('receipt', fn () => $this->receipt ? [
                'id' => $this->receipt->id,
                'receipt_number' => $this->receipt->receipt_number,
                'issued_at' => $this->receipt->issued_at?->toISOString(),
                'snapshot' => $this->receipt->snapshot,
            ] : null),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
