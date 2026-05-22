<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AllocationStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Allocation\StoreAllocationRequest;
use App\Http\Resources\AllocationResource;
use App\Models\Allocation;
use App\Services\RealEstate\AllocationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rules\Enum;

class AllocationController extends Controller
{
    public function __construct(private readonly AllocationService $allocationService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'client_id' => ['sometimes', 'integer', 'exists:clients,id'],
            'property_id' => ['sometimes', 'integer', 'exists:properties,id'],
            'realtor_id' => ['sometimes', 'integer', 'exists:realtors,id'],
            'status' => ['sometimes', new Enum(AllocationStatus::class)],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $allocations = Allocation::query()
            ->with(['client.realtor', 'realtor', 'property', 'payments.receipt'])
            ->when($validated['client_id'] ?? null, fn ($query, int $clientId) => $query->where('client_id', $clientId))
            ->when($validated['property_id'] ?? null, fn ($query, int $propertyId) => $query->where('property_id', $propertyId))
            ->when($validated['realtor_id'] ?? null, fn ($query, int $realtorId) => $query->where('realtor_id', $realtorId))
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->latest()
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return AllocationResource::collection($allocations);
    }

    public function store(StoreAllocationRequest $request): JsonResponse
    {
        $allocation = $this->allocationService->create($request->validated(), $request->user());

        return response()->json([
            'message' => 'Allocation created successfully.',
            'data' => [
                'allocation' => new AllocationResource($allocation),
            ],
        ], 201);
    }

    public function show(Allocation $allocation): JsonResponse
    {
        return response()->json([
            'data' => [
                'allocation' => new AllocationResource(
                    $allocation->load(['client.realtor', 'realtor', 'property', 'payments.receipt', 'allocator'])
                ),
            ],
        ]);
    }

    public function destroy(Allocation $allocation): JsonResponse
    {
        $allocation = $this->allocationService->cancel($allocation);

        return response()->json([
            'message' => 'Allocation cancelled successfully.',
            'data' => [
                'allocation' => new AllocationResource($allocation),
            ],
        ]);
    }
}
