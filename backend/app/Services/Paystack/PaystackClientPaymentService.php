<?php

namespace App\Services\Paystack;

use App\Models\Client;
use App\Models\PaystackClientTransaction;
use App\Models\RentalPaymentPeriod;
use App\Models\ServiceCharge;
use App\Services\RealEstate\RentalPaymentService;
use App\Services\RealEstate\ServiceChargePaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class PaystackClientPaymentService
{
    public function __construct(private readonly PaystackClient $gateway, private readonly RentalPaymentService $rentPayments, private readonly ServiceChargePaymentService $chargePayments) {}
    public function configured(): bool { return $this->gateway->configured(); }

    public function startCheckout(Client $client, string $category, int $targetId, mixed $requested): PaystackClientTransaction
    {
        if (! $this->configured()) throw new RuntimeException('Paystack payments are not configured yet.');
        if (! in_array($category, ['rental', 'service_charge'], true)) abort(422, 'Invalid payment category.');
        $amountCents = $this->cents($requested);
        $order = DB::transaction(function () use ($client, $category, $targetId, $amountCents) {
            if ($category === 'rental') {
                $target = RentalPaymentPeriod::query()->lockForUpdate()->findOrFail($targetId);
                $agreement = $target->rentalAgreement()->lockForUpdate()->firstOrFail();
                abort_unless((int) $agreement->client_id === (int) $client->id, 404);
                if ($agreement->status->value !== 'active') throw ValidationException::withMessages(['target_id' => ['Rent can only be paid for an active tenancy.']]);
                $confirmed = $this->cents($target->payments()->where('status', 'confirmed')->sum('amount'));
                $proof = $this->cents($target->paymentProofSubmissions()->where('status', 'pending')->sum('amount'));
                $reserved = $this->cents(PaystackClientTransaction::where('rental_payment_period_id', $target->id)->where('status', 'pending')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->sum('amount'));
                $due = $this->cents($target->amount_due);
                $foreignKey = ['rental_payment_period_id' => $target->id, 'service_charge_id' => null];
            } else {
                $target = ServiceCharge::query()->lockForUpdate()->findOrFail($targetId);
                $agreement = $target->rentalAgreement()->lockForUpdate()->firstOrFail();
                abort_unless((int) $target->client_id === (int) $client->id && (int) $agreement->client_id === (int) $client->id, 404);
                if ($agreement->status->value !== 'active') throw ValidationException::withMessages(['target_id' => ['Service charges can only be paid for an active tenancy.']]);
                $confirmed = $this->cents($target->payments()->where('status', 'confirmed')->sum('amount'));
                $proof = $this->cents($target->paymentProofSubmissions()->where('status', 'pending')->sum('amount'));
                $reserved = $this->cents(PaystackClientTransaction::where('service_charge_id', $target->id)->where('status', 'pending')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->sum('amount'));
                $due = $this->cents($target->amount_due);
                $foreignKey = ['rental_payment_period_id' => null, 'service_charge_id' => $target->id];
            }
            if ($amountCents < 100 || $amountCents > max(0, $due - $confirmed - $proof - $reserved)) {
                throw ValidationException::withMessages(['amount' => ['Enter at least NGN 1.00 and no more than the available balance.']]);
            }
            return PaystackClientTransaction::create($foreignKey + [
                'client_id' => $client->id, 'category' => $category, 'reference' => 'TR-'.Str::upper((string) Str::ulid()),
                'amount' => number_format($amountCents / 100, 2, '.', ''), 'currency' => 'NGN', 'status' => 'pending',
                'expires_at' => now()->addMinutes(max(5, min(120, (int) config('services.paystack.checkout_expire_minutes', 30)))),
            ]);
        });

        try {
            $page = $category === 'rental' ? 'rent-payments' : 'service-charges';
            $return = rtrim((string) config('services.paystack.frontend_url'), '/').'/client/'.$page.'?paystack_reference='.urlencode($order->reference);
            $data = $this->gateway->initialize([
                'email' => $client->email, 'amount' => $this->cents($order->amount), 'currency' => 'NGN',
                'reference' => $order->reference, 'callback_url' => $return,
                'metadata' => ['payment_category' => $category, 'client_id' => $client->id, 'target_id' => $targetId],
            ]);
            $order->update(['authorization_url' => $data['authorization_url'], 'access_code' => $data['access_code'] ?? null, 'provider_payload' => ['initialize' => ['status' => true]]]);
        } catch (Throwable $e) {
            $order->update(['status' => 'failed', 'failure_reason' => 'Unable to create Paystack checkout.']);
            report($e);
            throw new RuntimeException('Unable to start Paystack checkout. Please try again.');
        }
        return $order->fresh();
    }

    public function verifyAndApply(string $reference): ?PaystackClientTransaction
    {
        $order = PaystackClientTransaction::where('reference', $reference)->first();
        if (! $order) return null;
        if (in_array($order->status, ['paid', 'review'], true)) return $order->load(['rentalPayment.receipt', 'serviceChargePayment.receipt']);
        $data = $this->gateway->verify($reference);
        $providerStatus = strtolower((string) ($data['status'] ?? ''));

        return DB::transaction(function () use ($order, $data, $providerStatus) {
            $locked = PaystackClientTransaction::query()->lockForUpdate()->findOrFail($order->id);
            if (in_array($locked->status, ['paid', 'review'], true)) return $locked;
            $amount = (int) ($data['amount'] ?? -1);
            $txid = isset($data['id']) ? (int) $data['id'] : null;
            $changes = ['verified_at' => now(), 'provider_payload' => ['status' => ['status' => $providerStatus]]];
            if ($providerStatus !== 'success') {
                if (in_array($providerStatus, ['failed', 'abandoned'], true)) $locked->update($changes + ['status' => 'failed', 'failure_reason' => 'Paystack reports this transaction as '.$providerStatus.'.']);
                return $locked->fresh();
            }
            if (($data['reference'] ?? null) !== $locked->reference || $amount !== $this->cents($locked->amount) || strtoupper((string) ($data['currency'] ?? '')) !== 'NGN') {
                return tap($locked)->update($changes + ['status' => 'review', 'failure_reason' => 'Verified Paystack transaction details did not match this payment.']);
            }
            if ($txid && PaystackClientTransaction::where('provider_transaction_id', $txid)->where('id', '<>', $locked->id)->exists()) {
                return tap($locked)->update($changes + ['status' => 'review', 'failure_reason' => 'Paystack transaction ID was already used.']);
            }
            $changes['provider_transaction_id'] = $txid;
            if ($locked->category === 'rental') {
                $target = RentalPaymentPeriod::query()->lockForUpdate()->findOrFail($locked->rental_payment_period_id);
                try {
                    $payment = $this->rentPayments->recordForPeriod($target, ['amount' => $locked->amount, 'paid_at' => now(), 'payment_method' => 'paystack', 'transaction_reference' => $locked->reference, 'notes' => 'Verified automatically via Paystack.']);
                } catch (ValidationException) {
                    $locked->update($changes + ['status' => 'review', 'failure_reason' => 'Verified payment could not be posted against the current rent balance.']);
                    return $locked->fresh();
                }
                $locked->update($changes + ['status' => 'paid', 'failure_reason' => null, 'rental_payment_id' => $payment->id]);
            } else {
                $target = ServiceCharge::query()->lockForUpdate()->findOrFail($locked->service_charge_id);
                try {
                    $payment = $this->chargePayments->recordForCharge($target, ['amount' => $locked->amount, 'payment_method' => 'paystack', 'transaction_reference' => $locked->reference, 'notes' => 'Verified automatically via Paystack.']);
                } catch (ValidationException) {
                    $locked->update($changes + ['status' => 'review', 'failure_reason' => 'Verified payment could not be posted against the current service charge balance.']);
                    return $locked->fresh();
                }
                $locked->update($changes + ['status' => 'paid', 'failure_reason' => null, 'service_charge_payment_id' => $payment->id]);
            }
            return $locked->fresh();
        });
    }

    public function validWebhook(string $raw, ?string $signature, ?string $legacySignature): bool { return $this->gateway->validWebhookSignature($raw, $signature, $legacySignature); }
    private function cents(mixed $amount): int { return (int) round((float) $amount * 100); }
}
