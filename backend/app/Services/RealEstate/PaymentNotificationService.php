<?php

namespace App\Services\RealEstate;

use App\Models\Payment;

class PaymentNotificationService
{
    public function __construct(private readonly EmailNotificationService $emailNotificationService)
    {
    }

    public function sendPaymentReceived(Payment $payment): void
    {
        $this->emailNotificationService->sendPaymentReceived($payment);
    }

    public function sendPaymentUpdated(Payment $payment, float $oldAmount): void
    {
        $this->emailNotificationService->sendPaymentUpdated($payment, $oldAmount);
    }
}
