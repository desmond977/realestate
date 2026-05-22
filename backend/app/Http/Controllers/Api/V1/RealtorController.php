<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Realtor\StoreRealtorRequest;
use App\Http\Requests\Realtor\UpdateRealtorRequest;
use App\Http\Resources\RealtorResource;
use App\Models\Realtor;
use App\Services\RealEstate\RealtorAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class RealtorController extends Controller
{
    public function __construct(private readonly RealtorAnalyticsService $analyticsService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $realtors = Realtor::query()
            ->withCount(['clients', 'allocations', 'payments'])
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('full_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%");
                });
            })
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->latest()
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return RealtorResource::collection($realtors);
    }

    public function store(StoreRealtorRequest $request): JsonResponse
    {
        $realtor = Realtor::query()->create($request->validated());

        return response()->json([
            'message' => 'Realtor created successfully.',
            'data' => [
                'realtor' => new RealtorResource($realtor),
            ],
        ], 201);
    }

    public function show(Realtor $realtor): JsonResponse
    {
        return response()->json([
            'data' => [
                'realtor' => new RealtorResource($realtor->loadCount(['clients', 'allocations', 'payments'])),
            ],
        ]);
    }

    public function update(UpdateRealtorRequest $request, Realtor $realtor): JsonResponse
    {
        $realtor->update($request->validated());

        return response()->json([
            'message' => 'Realtor updated successfully.',
            'data' => [
                'realtor' => new RealtorResource($realtor->fresh()->loadCount(['clients', 'allocations', 'payments'])),
            ],
        ]);
    }

    public function destroy(Realtor $realtor): JsonResponse
    {
        $realtor->delete();

        return response()->json([
            'message' => 'Realtor deleted successfully.',
        ]);
    }

    public function analytics(Realtor $realtor): JsonResponse
    {
        return response()->json([
            'data' => $this->analyticsService->overview($realtor),
        ]);
    }
}
