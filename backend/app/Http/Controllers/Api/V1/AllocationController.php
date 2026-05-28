<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AllocationStatus;
use App\Enums\PropertyStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Allocation\StoreAllocationRequest;
use App\Http\Requests\Allocation\UpdateAllocationRequest;
use App\Http\Resources\AllocationResource;
use App\Http\Resources\ClientResource;
use App\Http\Resources\PropertyResource;
use App\Http\Resources\RealtorResource;
use App\Models\Allocation;
use App\Models\Client;
use App\Models\Property;
use App\Models\Realtor;
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

    public function formOptions(): JsonResponse
    {
        $clients = Client::query()
            ->with('realtor')
            ->latest()
            ->limit(100)
            ->get();

        $properties = Property::query()
            ->where('status', '!=', PropertyStatus::Sold)
            ->where('available_count', '>', 0)
            ->latest()
            ->limit(100)
            ->get();

        $realtors = Realtor::query()
            ->where('status', 'active')
            ->latest()
            ->limit(100)
            ->get();

        return response()->json([
            'data' => [
                'clients' => ClientResource::collection($clients),
                'properties' => PropertyResource::collection($properties),
                'realtors' => RealtorResource::collection($realtors),
            ],
        ]);
    }

    public function store(StoreAllocationRequest $request): JsonResponse
    {
        $allocation = $this->allocationService->create($request->validated(), $request->user());

        // Send email notifications (non-blocking, after transaction completes)
        $this->allocationService->notifyAllocationCreated($allocation);

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

    public function update(UpdateAllocationRequest $request, Allocation $allocation): JsonResponse
    {
        $allocation = $this->allocationService->updatePaymentState(
            $allocation,
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Allocation updated successfully.',
            'data' => [
                'allocation' => new AllocationResource($allocation),
            ],
        ]);
    }

    public function destroy(Allocation $allocation): JsonResponse
    {
        $role = request()->user()?->role;

        abort_unless($role === UserRole::Admin, 403, 'Only admins can delete allocations.');

        // Prevent deletion of allocations with payments to preserve transaction history
        if ($allocation->payments()->exists()) {
            return response()->json([
                'message' => 'Cannot delete allocation with recorded payments. Cancel the allocation instead.',
            ], 422);
        }

        $allocation->delete();

        return response()->json([
            'message' => 'Allocation deleted successfully.',
        ]);
    }
}
