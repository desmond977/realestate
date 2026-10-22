<?php

namespace App\Services\RealEstate;

use App\Enums\PaymentProofSubmissionStatus;
use App\Models\PaymentProofSubmission;
use App\Models\RentalPayment;
use App\Models\ServiceChargePayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class PaymentProofReviewService
{
    public function __construct(
        private readonly RentalPaymentService $rentalPaymentService,
        private readonly ServiceChargePaymentService $serviceChargePaymentService,
    ) {}

    public function approve(PaymentProofSubmission $submission, User $reviewer): PaymentProofSubmission
    {
        $approvedSubmission = DB::transaction(function () use ($submission, $reviewer) {
            $submission = PaymentProofSubmission::query()
                ->lockForUpdate()
                ->findOrFail($submission->id);

            $this->ensurePending($submission);
            $this->ensurePositiveAmount($submission);

            if ($submission->payment_category === 'rental') {
                $this->ensureRentalReferenceAvailable($submission);
                $period = $submission->rentalPaymentPeriod()->firstOrFail();
                $agreement = $period->rentalAgreement()->firstOrFail();
                if ((int) $agreement->client_id !== (int) $submission->client_id) {
                    throw ValidationException::withMessages([
                        'rental_payment_period_id' => ['This rental period does not belong to the submitting client.'],
                    ]);
                }

                $payment = $this->rentalPaymentService->recordForPeriod(
                    $period,
                    $this->paymentPayload($submission),
                    $reviewer,
                    $submission
                );
            } else {
                $this->ensureServiceChargeReferenceAvailable($submission);
                $charge = $submission->serviceCharge()->firstOrFail();
                $agreement = $charge->rentalAgreement()->firstOrFail();
                if (
                    (int) $charge->client_id !== (int) $submission->client_id
                    || (int) $agreement->client_id !== (int) $submission->client_id
                    || (int) $agreement->rental_property_id !== (int) $charge->rental_property_id
                ) {
                    throw ValidationException::withMessages([
                        'service_charge_id' => ['This service charge does not belong to the submitting client and tenancy.'],
                    ]);
                }

                $payment = $this->serviceChargePaymentService->recordForCharge(
                    $charge,
                    $this->paymentPayload($submission),
                    $reviewer,
                    $submission
                );
            }

            $submission->forceFill([
                'status' => PaymentProofSubmissionStatus::Approved,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ])->save();

            return $submission->load([
                'client',
                'rentalPaymentPeriod.rentalAgreement.client',
                'rentalPaymentPeriod.rentalAgreement.rentalProperty.property',
                'serviceCharge.category',
                'serviceCharge.client',
                'serviceCharge.rentalProperty.property',
                'rentalPayment.receipt',
                'serviceChargePayment.receipt',
            ]);
        });

        $this->notifyClient($approvedSubmission);

        return $approvedSubmission;
    }

    public function reject(
        PaymentProofSubmission $submission,
        User $reviewer,
        string $reason
    ): PaymentProofSubmission {
        $rejectedSubmission = DB::transaction(function () use ($submission, $reviewer, $reason) {
            $submission = PaymentProofSubmission::query()
                ->lockForUpdate()
                ->findOrFail($submission->id);

            $this->ensurePending($submission);

            $submission->forceFill([
                'status' => PaymentProofSubmissionStatus::Rejected,
                'reviewed_by' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => $reason,
            ])->save();

            return $submission->load([
                'client',
                'rentalPaymentPeriod.rentalAgreement.client',
                'rentalPaymentPeriod.rentalAgreement.rentalProperty.property',
                'serviceCharge.category',
                'serviceCharge.client',
                'serviceCharge.rentalProperty.property',
            ]);
        });

        $this->notifyClient($rejectedSubmission);

        return $rejectedSubmission;
    }

    private function ensurePending(PaymentProofSubmission $submission): void
    {
        if ($submission->status !== PaymentProofSubmissionStatus::Pending) {
            throw ValidationException::withMessages([
                'submission' => ['This payment proof has already been reviewed.'],
            ]);
        }
    }

    private function ensurePositiveAmount(PaymentProofSubmission $submission): void
    {
        if ((float) $submission->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => ['The submitted payment amount must be greater than zero.'],
            ]);
        }
    }

    /**
     * @return array{amount: string, paid_at: string, payment_method: string, transaction_reference: string, notes: string}
     */
    private function paymentPayload(PaymentProofSubmission $submission): array
    {
        return [
            'amount' => (string) $submission->amount,
            'paid_at' => $submission->paid_at->toDateString(),
            'payment_method' => 'client_proof',
            'transaction_reference' => $submission->transaction_reference,
            'notes' => "Approved payment proof submission #{$submission->id}.",
        ];
    }

    private function ensureRentalReferenceAvailable(PaymentProofSubmission $submission): void
    {
        if (RentalPayment::query()
            ->where('transaction_reference', $submission->transaction_reference)
            ->exists()) {
            throw ValidationException::withMessages([
                'transaction_reference' => ['This transaction reference is already recorded as a rental payment.'],
            ]);
        }
    }

    private function ensureServiceChargeReferenceAvailable(PaymentProofSubmission $submission): void
    {
        if (ServiceChargePayment::query()
            ->where('transaction_reference', $submission->transaction_reference)
            ->exists()) {
            throw ValidationException::withMessages([
                'transaction_reference' => ['This transaction reference is already recorded as a service charge payment.'],
            ]);
        }
    }

    private function notifyClient(PaymentProofSubmission $submission): void
    {
        if (! $submission->client?->email) {
            return;
        }

        try {
            Mail::to($submission->client->email)->queue(
                new \App\Mail\PaymentProofReviewedMail($submission)
            );
        } catch (Throwable $exception) {
            Log::error('Unable to queue payment proof review notification.', [
                'submission_id' => $submission->id,
                'client_id' => $submission->client_id,
                'status' => $submission->status?->value,
                'exception' => $exception->getMessage(),
            ]);
        }
    }
}
