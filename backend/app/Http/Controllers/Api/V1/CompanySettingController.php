<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateCompanySettingRequest;
use App\Http\Resources\CompanySettingResource;
use App\Models\CompanySetting;
use Illuminate\Http\JsonResponse;

class CompanySettingController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'data' => [
                'settings' => new CompanySettingResource($this->settings()),
            ],
        ]);
    }

    public function update(UpdateCompanySettingRequest $request): JsonResponse
    {
        $settings = $this->settings();
        $settings->update($request->validated());

        return response()->json([
            'message' => 'Company settings updated successfully.',
            'data' => [
                'settings' => new CompanySettingResource($settings->refresh()),
            ],
        ]);
    }

    private function settings(): CompanySetting
    {
        return CompanySetting::query()->firstOrCreate([], [
            'target_type' => 'monthly',
            'target_amount' => 250000,
            'theme_mode' => 'system',
            'brand_color' => '#166534',
        ]);
    }
}
