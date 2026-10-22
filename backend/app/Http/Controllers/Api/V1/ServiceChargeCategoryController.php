<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ServiceChargeCategory;
use App\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ServiceChargeCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        ServiceChargeCategory::ensureDefaults();

        return response()->json([
            'data' => [
                'categories' => ServiceChargeCategory::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'description', 'is_system']),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);
        $existing = ServiceChargeCategory::withTrashed()->where('name', $data['name'])->first();

        if ($existing?->trashed()) {
            $existing->restore();
            $existing->update($data);

            return response()->json([
                'message' => 'Service charge category restored successfully.',
                'data' => ['category' => $existing->fresh()],
            ]);
        }

        $this->validateUniqueName($data['name']);

        $category = ServiceChargeCategory::query()->create($data);

        return response()->json([
            'message' => 'Service charge category created successfully.',
            'data' => ['category' => $category],
        ], 201);
    }

    public function update(Request $request, ServiceChargeCategory $category): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);
        $this->validateUniqueName($data['name'], $category);
        $category->update($data);

        return response()->json([
            'message' => 'Service charge category updated successfully.',
            'data' => ['category' => $category->fresh()],
        ]);
    }

    public function destroy(ServiceChargeCategory $category): JsonResponse
    {
        if ($category->is_system) {
            throw ValidationException::withMessages([
                'category' => ['Default service charge categories cannot be deleted.'],
            ]);
        }

        if ($category->charges()->withTrashed()->exists()) {
            throw ValidationException::withMessages([
                'category' => ['Categories already used by charges cannot be deleted.'],
            ]);
        }

        $category->delete();

        return response()->json(['message' => 'Service charge category deleted successfully.']);
    }

    private function validateUniqueName(string $name, ?ServiceChargeCategory $category = null): void
    {
        $tenantId = app(TenantManager::class)->currentId() ?? 1;
        $rule = Rule::unique('service_charge_categories', 'name')
            ->where('tenant_id', $tenantId);

        if ($category) {
            $rule->ignore($category->id);
        }

        validator(['name' => $name], ['name' => ['required', $rule]])->validate();
    }
}
