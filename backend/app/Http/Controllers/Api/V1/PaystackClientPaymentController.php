<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PaystackClientTransaction;
use App\Services\Paystack\PaystackClientPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class PaystackClientPaymentController extends Controller
{
    public function __construct(private readonly PaystackClientPaymentService $payments) {}

    public function availability(): JsonResponse { return response()->json(['data' => ['enabled' => $this->payments->configured()]]); }

    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate(['category' => ['required', 'in:rental,service_charge'], 'target_id' => ['required', 'integer', 'min:1'], 'amount' => ['required', 'numeric', 'min:1', 'max:9999999999999.99']]);
        try { $order = $this->payments->startCheckout($request->user(), $data['category'], (int) $data['target_id'], $data['amount']); }
        catch (HttpExceptionInterface $e) { throw $e; }
        catch (RuntimeException $e) { return response()->json(['message' => $e->getMessage()], 503); }
        return response()->json(['data' => ['reference' => $order->reference, 'amount' => (float) $order->amount, 'checkout_url' => $order->authorization_url, 'status' => $order->status]], 201);
    }

    public function status(Request $request, string $reference): JsonResponse
    {
        $order = PaystackClientTransaction::where('client_id', $request->user()->id)->where('reference', $reference)->firstOrFail();
        if ($order->status === 'pending') {
            try { $order = $this->payments->verifyAndApply($reference) ?? $order; }
            catch (Throwable $e) { Log::warning('Paystack status refresh unavailable.', ['reference' => $reference]); }
        }
        return response()->json(['data' => ['reference' => $order->reference, 'status' => $order->status, 'failure_reason' => $order->failure_reason, 'receipt' => $order->category === 'rental' ? $order->rentalPayment?->receipt?->only(['id', 'receipt_number', 'issued_at']) : $order->serviceChargePayment?->receipt?->only(['id', 'receipt_number', 'issued_at'])]]);
    }

    public function webhook(Request $request): JsonResponse
    {
        $raw = $request->getContent();
        if (! $this->payments->validWebhook($raw, $request->header('paystack-signature'), $request->header('x-paystack-signature'))) return response()->json(['message' => 'Invalid webhook signature.'], 401);
        $event = json_decode($raw, true);
        if (($event['event'] ?? null) !== 'charge.success') return response()->json([], 200);
        $reference = data_get($event, 'data.reference');
        if (! is_string($reference) || $reference === '') return response()->json([], 200);
        try { $this->payments->verifyAndApply($reference); }
        catch (Throwable $e) { Log::warning('Paystack webhook verification unavailable.', ['reference' => $reference]); return response()->json(['message' => 'Verification temporarily unavailable.'], 503); }
        return response()->json([], 200);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => ['sometimes', 'in:pending,paid,failed,review'], 'search' => ['sometimes', 'string', 'max:255'], 'per_page' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $items = PaystackClientTransaction::with(['client:id,first_name,last_name,email', 'period.rentalAgreement.rentalProperty:id,name', 'serviceCharge.rentalProperty:id,name', 'rentalPayment.receipt:id,rental_payment_id,receipt_number', 'serviceChargePayment.receipt:id,service_charge_payment_id,receipt_number'])
            ->when($data['status'] ?? null, fn($q, $status) => $q->where('status', $status))
            ->when($data['search'] ?? null, fn($q, $search) => $q->where(fn($q) => $q->where('reference', 'like', "%{$search}%")->orWhereHas('client', fn($c) => $c->where('first_name', 'like', "%{$search}%")->orWhere('last_name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))))
            ->latest()->paginate($data['per_page'] ?? 20)->withQueryString();
        return response()->json(['data' => $items->getCollection()->map(fn($tx) => ['id' => $tx->id, 'category' => $tx->category, 'reference' => $tx->reference, 'transaction_id' => $tx->provider_transaction_id, 'amount' => (float) $tx->amount, 'currency' => $tx->currency, 'status' => $tx->status, 'failure_reason' => $tx->failure_reason, 'created_at' => $tx->created_at, 'verified_at' => $tx->verified_at, 'client' => $tx->client?->only(['id', 'full_name', 'email']), 'property' => $tx->period?->rentalAgreement?->rentalProperty?->name ?? $tx->serviceCharge?->rentalProperty?->name, 'receipt' => $tx->rentalPayment?->receipt?->only(['id', 'receipt_number']) ?? $tx->serviceChargePayment?->receipt?->only(['id', 'receipt_number'])]), 'meta' => ['current_page' => $items->currentPage(), 'last_page' => $items->lastPage(), 'per_page' => $items->perPage(), 'total' => $items->total()]]);
    }
}
