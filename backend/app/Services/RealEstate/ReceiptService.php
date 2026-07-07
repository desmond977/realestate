<?php

namespace App\Services\RealEstate;

use App\Models\Payment;
use App\Models\Receipt;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ReceiptService
{
    public function __construct(private readonly ReceiptSnapshotService $receiptSnapshotService)
    {
    }

    /**
     * @param array<string, mixed> $metadata
     */
    public function createForPayment(Payment $payment, ?User $issuer = null, array $metadata = []): Receipt
    {
        return DB::transaction(function () use ($payment, $issuer, $metadata) {
            $payment = Payment::query()
                ->with(['receipt', 'allocation', 'client', 'realtor', 'property'])
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if ($payment->receipt) {
                return $payment->receipt;
            }

            $issuedAt = now();
            $receiptNumber = $this->generateReceiptNumber($payment);

            return Receipt::query()->create([
                'payment_id' => $payment->id,
                'issued_by' => $issuer?->id,
                'receipt_number' => $receiptNumber,
                'issued_at' => $issuedAt,
                'metadata' => [
                    'amount' => (float) $payment->amount,
                    'allocation_id' => $payment->allocation_id,
                    'client_id' => $payment->client_id,
                    'realtor_id' => $payment->realtor_id,
                    'property_id' => $payment->property_id,
                    'payment_method' => $payment->payment_method,
                ] + $metadata,
                'snapshot' => $this->receiptSnapshotService->build($payment, $receiptNumber, $issuedAt, $issuer),
            ]);
        });
    }

    private function generateReceiptNumber(Payment $payment): string
    {
        return sprintf('REC-%s-%06d', now()->format('Ymd'), $payment->id);
    }
}
