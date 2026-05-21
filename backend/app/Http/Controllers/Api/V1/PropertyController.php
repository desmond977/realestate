<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PropertyStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Property\StorePropertyRequest;
use App\Http\Requests\Property\UpdatePropertyRequest;
use App\Http\Resources\PropertyResource;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Enum;

class PropertyController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', new Enum(PropertyStatus::class)],
            'type' => ['sometimes', 'string', 'max:100'],
            'location' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $properties = Property::query()
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('title', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            })
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($validated['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
            ->when($validated['location'] ?? null, fn ($query, string $location) => $query->where('location', 'like', "%{$location}%"))
            ->latest()
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return PropertyResource::collection($properties);
    }

    public function store(StorePropertyRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image') && $request->file('image')->isValid()) {
            $data['image'] = $request->file('image')->store('properties', 'public');
        }

        $property = Property::query()->create($data);

        return response()->json([
            'message' => 'Property created successfully.',
            'data' => [
                'property' => new PropertyResource($property),
            ],
        ], 201);
    }

    public function show(Property $property): JsonResponse
    {
        return response()->json([
            'data' => [
                'property' => new PropertyResource($property),
            ],
        ]);
    }

    public function update(UpdatePropertyRequest $request, Property $property): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image') && $request->file('image')->isValid()) {
            if ($property->image && Storage::disk('public')->exists($property->image)) {
                Storage::disk('public')->delete($property->image);
            }

            $data['image'] = $request->file('image')->store('properties', 'public');
        }

        $property->update($data);

        return response()->json([
            'message' => 'Property updated successfully.',
            'data' => [
                'property' => new PropertyResource($property->fresh()),
            ],
        ]);
    }

    public function destroy(Property $property): JsonResponse
    {
        $property->delete();

        return response()->json([
            'message' => 'Property deleted successfully.',
        ]);
    }
}
