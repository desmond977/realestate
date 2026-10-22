<?php

namespace App\Services\RealEstate;

use App\Enums\RentalPaymentStatus;
use App\Models\RentalPayment;
use App\Models\RentalPaymentPeriod;
use App\Models\RentalReceipt;
use App\Models\PaymentProofSubmission;
use App\Models\User;
use App\Services\CompanySettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RentalPaymentService
{
    public function __construct(private readonly CompanySettings $companySettings) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function recordForPeriod(
        RentalPaymentPeriod $period,
        array $payload,
        ?User $recorder = null,
        ?PaymentProofSubmission $proofSubmission = null
    ): RentalPayment {
        return DB::transaction(function () use ($period, $payload, $recorder, $proofSubmission): RentalPayment {
            $period = RentalPaymentPeriod::query()
                ->lockForUpdate()
                ->findOrFail($period->id);

            $agreement = $period->rentalAgreement()->lockForUpdate()->firstOrFail();

            if ($agreement->status->value !== 'active') {
                throw ValidationException::withMessages([
                    'rental_payment_period_id' => ['Payments can only be recorded for active rental agreements.'],
                ]);
            }

            $amountCents = $this->toCents($payload['amount']);
            $paidCents = $this->toCents($period->payments()
                ->where('status', RentalPaymentStatus::Confirmed->value)
                ->sum('amount'));
            $dueCents = $this->toCents($period->amount_due);
            $balanceCents = max(0, $dueCents - $paidCents);

            if ($amountCents > $balanceCents) {
                throw ValidationException::withMessages([
                    'amount' => ['Payment amount cannot exceed the outstanding amount for this rental period.'],
                ]);
            }

            $payment = $period->payments()->create([
                'recorded_by' => $recorder?->id,
                'amount' => number_format($amountCents / 100, 2, '.', ''),
                'paid_at' => $payload['paid_at'],
                'payment_method' => $payload['payment_method'],
                'transaction_reference' => $payload['transaction_reference'] ?? null,
                'status' => RentalPaymentStatus::Confirmed,
                'proof_of_payment_path' => $proofSubmission?->proof_of_payment_path,
                'payment_proof_submission_id' => $proofSubmission?->id,
                'notes' => $payload['notes'] ?? null,
            ]);

            $this->createReceipt($payment, $recorder);

            return $payment->load(['recorder', 'receipt']);
        });
    }

    private function createReceipt(RentalPayment $payment, ?User $issuer): RentalReceipt
    {
        $payment->loadMissing(['period.rentalAgreement.rentalProperty.property', 'period.rentalAgreement.client']);
        $agreement = $payment->period->rentalAgreement;
        $rentalProperty = $agreement->rentalProperty;
        $client = $agreement->client;
        $receiptNumber = sprintf('RREC-%s-%06d', now()->format('Ymd'), $payment->id);
        $issuedAt = now();

        return RentalReceipt::query()->create([
            'rental_payment_id' => $payment->id,
            'issued_by' => $issuer?->id,
            'receipt_number' => $receiptNumber,
            'issued_at' => $issuedAt,
            'snapshot' => [
                'document_type' => 'Rental payment receipt',
                'company' => $this->companySettings->get(),
                'receipt' => [
                    'number' => $receiptNumber,
                    'issued_at' => $issuedAt->toISOString(),
                    'generated_by' => $issuer?->name,
                ],
                'client' => [
                    'id' => $client->id,
                    'full_name' => $client->full_name,
                    'email' => $client->email,
                    'phone' => $client->phone,
                ],
                'rental' => [
                    'agreement_id' => $agreement->id,
                    'property_name' => $rentalProperty->name ?: $rentalProperty->property?->title,
                    'location' => $rentalProperty->location ?: $rentalProperty->property?->location,
                    'frequency' => $agreement->rental_frequency->value,
                ],
                'period' => [
                    'start' => $payment->period->period_start->toDateString(),
                    'end' => $payment->period->period_end->toDateString(),
                    'due_date' => $payment->period->due_date->toDateString(),
                    'amount_due' => (float) $payment->period->amount_due,
                ],
                'payment' => [
                    'id' => $payment->id,
                    'amount' => (float) $payment->amount,
                    'method' => $payment->payment_method,
                    'reference' => $payment->transaction_reference,
                    'paid_at' => $payment->paid_at->toISOString(),
                    'status' => $payment->status->value,
                ],
            ],
        ]);
    }

    private function toCents(mixed $amount): int
    {
        $formatted = number_format((float) $amount, 2, '.', '');
        [$whole, $fraction] = explode('.', $formatted);

        return ((int) $whole * 100) + (int) $fraction;
    }
}
