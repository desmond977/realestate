<?php

namespace App\Services\RealEstate;

use App\Enums\ServiceChargePaymentStatus;
use App\Models\ServiceCharge;
use App\Models\ServiceChargePayment;
use App\Models\ServiceChargeReceipt;
use App\Models\PaymentProofSubmission;
use App\Models\User;
use App\Services\CompanySettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ServiceChargePaymentService
{
    public function __construct(private readonly CompanySettings $companySettings) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function recordForCharge(
        ServiceCharge $charge,
        array $payload,
        ?User $recorder = null,
        ?PaymentProofSubmission $proofSubmission = null
    ): ServiceChargePayment {
        return DB::transaction(function () use ($charge, $payload, $recorder, $proofSubmission): ServiceChargePayment {
            $charge = ServiceCharge::query()->lockForUpdate()->findOrFail($charge->id);
            $agreement = $charge->rentalAgreement()->lockForUpdate()->firstOrFail();

            if ($agreement->status->value !== 'active') {
                throw ValidationException::withMessages([
                    'service_charge_id' => ['Payments can only be recorded for charges on active rental agreements.'],
                ]);
            }

            $amountCents = $this->toCents($payload['amount']);
            $paidCents = $this->toCents($charge->payments()
                ->where('status', ServiceChargePaymentStatus::Confirmed->value)
                ->sum('amount'));
            $dueCents = $this->toCents($charge->amount_due);

            if ($amountCents > max(0, $dueCents - $paidCents)) {
                throw ValidationException::withMessages([
                    'amount' => ['Payment amount cannot exceed the outstanding service charge balance.'],
                ]);
            }

            $payment = $charge->payments()->create([
                'recorded_by' => $recorder?->id,
                'amount' => number_format($amountCents / 100, 2, '.', ''),
                'paid_at' => $payload['paid_at'],
                'payment_method' => $payload['payment_method'],
                'transaction_reference' => $payload['transaction_reference'] ?? null,
                'status' => ServiceChargePaymentStatus::Confirmed,
                'proof_of_payment_path' => $proofSubmission?->proof_of_payment_path,
                'payment_proof_submission_id' => $proofSubmission?->id,
                'notes' => $payload['notes'] ?? null,
            ]);

            $this->createReceipt($payment, $recorder);

            return $payment->load(['recorder', 'receipt']);
        });
    }

    private function createReceipt(ServiceChargePayment $payment, ?User $issuer): ServiceChargeReceipt
    {
        $payment->loadMissing([
            'serviceCharge.category',
            'serviceCharge.rentalProperty.property',
            'serviceCharge.client',
            'serviceCharge.rentalAgreement',
        ]);
        $charge = $payment->serviceCharge;
        $property = $charge->rentalProperty;
        $client = $charge->client;
        $receiptNumber = sprintf('SCREC-%s-%06d', now()->format('Ymd'), $payment->id);
        $issuedAt = now();

        return ServiceChargeReceipt::query()->create([
            'service_charge_payment_id' => $payment->id,
            'issued_by' => $issuer?->id,
            'receipt_number' => $receiptNumber,
            'issued_at' => $issuedAt,
            'snapshot' => [
                'document_type' => 'Service charge payment receipt',
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
                'property' => [
                    'name' => $property->name ?: $property->property?->title,
                    'location' => $property->location ?: $property->property?->location,
                ],
                'service_charge' => [
                    'id' => $charge->id,
                    'category' => $charge->category->name,
                    'description' => $charge->description,
                    'billing_period_start' => $charge->billing_period_start->toDateString(),
                    'billing_period_end' => $charge->billing_period_end->toDateString(),
                    'amount_due' => (float) $charge->amount_due,
                    'amount_paid' => (float) $charge->confirmedAmountPaid(),
                    'balance' => (float) $charge->outstandingBalance(),
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
