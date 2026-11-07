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
        return response()->json([
            'data' => [
                'categories' => ServiceChargeCategory::query()
                    ->orderBy('name')
                    ->get(['id', 'name', 'description', 'is_system', 'monthly_amount', 'is_active']),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'monthly_amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        if (ServiceChargeCategory::query()->exists()) {
            throw ValidationException::withMessages([
                'category' => ['Only one service charge category is allowed. Configure or delete the existing category first.'],
            ]);
        }
        $existing = ServiceChargeCategory::withTrashed()->where('name', $data['name'])->first();

        if ($existing?->trashed()) {
            $existing->restore();
            $existing->update([...$data, 'is_system' => false]);

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
            'monthly_amount' => ['sometimes', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'is_active' => ['required', 'boolean'],
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
