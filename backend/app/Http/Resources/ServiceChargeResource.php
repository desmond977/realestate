<?php

namespace App\Http\Resources;

use App\Enums\ServiceChargePaymentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceChargeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $amountPaid = (float) ($this->amount_paid ?? 0);
        $amountDue = (float) $this->amount_due;
        $balance = max(0, round($amountDue - $amountPaid, 2));
        $status = $balance <= 0
            ? 'paid'
            : ($this->due_date->isPast() && ! $this->due_date->isToday()
                ? 'overdue'
                : ($amountPaid > 0 ? 'partial' : 'due'));

        return [
            'id' => $this->id,
            'description' => $this->description,
            'billing_period_start' => $this->billing_period_start?->toDateString(),
            'billing_period_end' => $this->billing_period_end?->toDateString(),
            'billing_date' => $this->billing_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'amount_due' => $amountDue,
            'amount_paid' => $amountPaid,
            'balance' => $balance,
            'status' => $status,
            'notes' => $this->notes,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
                'is_system' => $this->category->is_system,
            ]),
            'rental_agreement' => $this->whenLoaded('rentalAgreement', fn () => [
                'id' => $this->rentalAgreement->id,
                'status' => $this->rentalAgreement->status?->value,
            ]),
            'rental_property' => $this->whenLoaded('rentalProperty', fn () => [
                'id' => $this->rentalProperty->id,
                'name' => $this->rentalProperty->name ?: $this->rentalProperty->property?->title,
                'location' => $this->rentalProperty->location ?: $this->rentalProperty->property?->location,
            ]),
            'client' => $this->whenLoaded('client', fn () => [
                'id' => $this->client->id,
                'full_name' => $this->client->full_name,
                'email' => $this->client->email,
                'phone' => $this->client->phone,
            ]),
            'payments' => ServiceChargePaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
