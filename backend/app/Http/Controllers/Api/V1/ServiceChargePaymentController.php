<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceChargePaymentResource;
use App\Http\Resources\ServiceChargeResource;
use App\Models\ServiceCharge;
use App\Services\RealEstate\ServiceChargePaymentService;
use App\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceChargePaymentController extends Controller
{
    public function __construct(private readonly ServiceChargePaymentService $paymentService) {}

    public function store(Request $request, ServiceCharge $serviceCharge): JsonResponse
    {
        $tenantId = app(TenantManager::class)->currentId();
        $referenceRule = Rule::unique('service_charge_payments', 'transaction_reference')
            ->where(fn ($query) => $tenantId === null
                ? $query
                : $query->where('tenant_id', $tenantId));

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            // The recorded server timestamp is authoritative; clients cannot backdate it.
            'payment_method' => ['required', 'string', 'max:100'],
            'transaction_reference' => ['nullable', 'string', 'max:255', $referenceRule],
            'notes' => ['nullable', 'string'],
        ]);

        $payment = $this->paymentService->recordForCharge($serviceCharge, $validated, $request->user());
        $serviceCharge->refresh()
            ->load(['category', 'rentalAgreement', 'rentalProperty.property', 'client'])
            ->setAttribute('amount_paid', $serviceCharge->confirmedAmountPaid());

        return response()->json([
            'message' => 'Service charge payment recorded successfully.',
            'data' => [
                'payment' => new ServiceChargePaymentResource($payment),
                'service_charge' => new ServiceChargeResource($serviceCharge),
            ],
        ], 201);
    }
}
