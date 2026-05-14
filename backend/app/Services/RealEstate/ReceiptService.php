<?php

namespace App\Services\RealEstate;

use App\Models\Payment;
use App\Models\Receipt;
use App\Models\User;

class ReceiptService
{
    public function createForPayment(Payment $payment, ?User $issuer = null): Receipt
    {
        return Receipt::query()->create([
            'payment_id' => $payment->id,
            'issued_by' => $issuer?->id,
            'receipt_number' => $this->generateReceiptNumber($payment),
            'issued_at' => now(),
            'metadata' => [
                'amount' => (float) $payment->amount,
                'client_id' => $payment->client_id,
                'property_id' => $payment->property_id,
                'payment_method' => $payment->payment_method,
            ],
        ]);
    }

    private function generateReceiptNumber(Payment $payment): string
    {
        return sprintf('REC-%s-%06d', now()->format('Ymd'), $payment->id);
    }
}
