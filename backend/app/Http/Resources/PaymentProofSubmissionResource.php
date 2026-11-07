<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentProofSubmissionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'payment_category' => $this->payment_category,
            'amount' => (float) $this->amount,
            'paid_at' => $this->paid_at?->toDateString(),
            'transaction_reference' => $this->transaction_reference,
            'status' => $this->status?->value,
            'rejection_reason' => $this->rejection_reason,
            'proof_url' => $request->user() instanceof User
                ? route('admin.payment-approvals.proof', $this->id)
                : route('client.payment-proof-submissions.proof', $this->id),
            'client' => $this->whenLoaded('client', fn () => [
                'id' => $this->client->id,
                'full_name' => $this->client->full_name,
                'email' => $this->client->email,
                'phone' => $this->client->phone,
            ]),
            'rental_payment_period' => $this->whenLoaded('rentalPaymentPeriod', fn () => $this->rentalPaymentPeriod ? [
                'id' => $this->rentalPaymentPeriod->id,
                'period_start' => $this->rentalPaymentPeriod->period_start?->toDateString(),
                'period_end' => $this->rentalPaymentPeriod->period_end?->toDateString(),
                'due_date' => $this->rentalPaymentPeriod->due_date?->toDateString(),
                'rental_agreement_id' => $this->rentalPaymentPeriod->rentalAgreement?->id,
                'lease_start_date' => $this->rentalPaymentPeriod->rentalAgreement?->lease_start_date?->toDateString(),
                'lease_end_date' => $this->rentalPaymentPeriod->rentalAgreement?->lease_end_date?->toDateString(),
                'tenant' => $this->rentalPaymentPeriod->rentalAgreement?->client?->full_name,
                'rental_property' => $this->rentalPaymentPeriod->rentalAgreement?->rentalProperty?->name
                    ?: $this->rentalPaymentPeriod->rentalAgreement?->rentalProperty?->property?->title,
            ] : null),
            'service_charge' => $this->whenLoaded('serviceCharge', fn () => $this->serviceCharge ? [
                'id' => $this->serviceCharge->id,
                'description' => $this->serviceCharge->description,
                'category' => $this->serviceCharge->category?->name,
                'billing_month' => $this->serviceCharge->billing_month ?: $this->serviceCharge->billing_period_start?->format('Y-m'),
                'amount_due' => (float) $this->serviceCharge->amount_due,
                'rental_agreement_id' => $this->serviceCharge->rentalAgreement?->id,
                'lease_start_date' => $this->serviceCharge->rentalAgreement?->lease_start_date?->toDateString(),
                'lease_end_date' => $this->serviceCharge->rentalAgreement?->lease_end_date?->toDateString(),
                'tenant' => $this->serviceCharge->client?->full_name,
                'rental_property' => $this->serviceCharge->rentalProperty?->name
                    ?: $this->serviceCharge->rentalProperty?->property?->title,
            ] : null),
            'submitted_at' => $this->created_at?->toISOString(),
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id' => $this->reviewer->id,
                'name' => $this->reviewer->name,
            ] : null),
            'recorded_payment' => $this->when(
                $this->relationLoaded('rentalPayment') || $this->relationLoaded('serviceChargePayment'),
                fn () => $this->payment_category === 'rental'
                    ? $this->whenLoaded('rentalPayment', fn () => $this->rentalPayment ? [
                        'id' => $this->rentalPayment->id,
                        'receipt_number' => $this->rentalPayment->receipt?->receipt_number,
                    ] : null)
                    : $this->whenLoaded('serviceChargePayment', fn () => $this->serviceChargePayment ? [
                        'id' => $this->serviceChargePayment->id,
                        'receipt_number' => $this->serviceChargePayment->receipt?->receipt_number,
                    ] : null)
            ),
        ];
    }
}
