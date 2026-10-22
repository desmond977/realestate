<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RentalPaymentPeriodResource extends JsonResource
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
            'period_start' => $this->period_start?->toDateString(),
            'period_end' => $this->period_end?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'amount_due' => $amountDue,
            'amount_paid' => $amountPaid,
            'balance' => $balance,
            'status' => $status,
            'rental_agreement' => $this->whenLoaded('rentalAgreement', fn () => [
                'id' => $this->rentalAgreement->id,
                'rental_frequency' => $this->rentalAgreement->rental_frequency?->value,
                'rental_amount' => (float) $this->rentalAgreement->rental_amount,
                'rental_property' => [
                    'name' => $this->rentalAgreement->rentalProperty?->name
                        ?: $this->rentalAgreement->rentalProperty?->property?->title,
                    'location' => $this->rentalAgreement->rentalProperty?->location
                        ?: $this->rentalAgreement->rentalProperty?->property?->location,
                ],
                'client' => [
                    'id' => $this->rentalAgreement->client?->id,
                    'full_name' => $this->rentalAgreement->client?->full_name,
                ],
            ]),
            'payments' => RentalPaymentResource::collection($this->whenLoaded('payments')),
        ];
    }
}
