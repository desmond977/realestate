<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Payment\StorePaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Allocation;
use App\Models\Payment;
use App\Services\RealEstate\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PaymentController extends Controller
{
    public function __construct(private readonly PaymentService $paymentService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'allocation_id' => ['sometimes', 'integer', 'exists:allocations,id'],
            'client_id' => ['sometimes', 'integer', 'exists:clients,id'],
            'property_id' => ['sometimes', 'integer', 'exists:properties,id'],
            'realtor_id' => ['sometimes', 'integer', 'exists:realtors,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $payments = Payment::query()
            ->with(['client.realtor', 'realtor', 'property', 'allocation', 'receipt'])
            ->when($validated['allocation_id'] ?? null, fn ($query, int $allocationId) => $query->where('allocation_id', $allocationId))
            ->when($validated['client_id'] ?? null, fn ($query, int $clientId) => $query->where('client_id', $clientId))
            ->when($validated['property_id'] ?? null, fn ($query, int $propertyId) => $query->where('property_id', $propertyId))
            ->when($validated['realtor_id'] ?? null, fn ($query, int $realtorId) => $query->where('realtor_id', $realtorId))
            ->latest('paid_at')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return PaymentResource::collection($payments);
    }

    public function store(StorePaymentRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $allocation = Allocation::query()->findOrFail($validated['allocation_id']);

        $payment = $this->paymentService->recordForAllocation($allocation, $validated, $request->user());

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'data' => [
                'payment' => new PaymentResource($payment),
            ],
        ], 201);
    }

    public function show(Payment $payment): JsonResponse
    {
        return response()->json([
            'data' => [
                'payment' => new PaymentResource(
                    $payment->load(['client', 'realtor', 'property', 'allocation', 'receipt.issuer', 'recorder'])
                ),
            ],
        ]);
    }
}
