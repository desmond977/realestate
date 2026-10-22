<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\RentalDashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RentalDashboardController extends Controller
{
    public function __construct(private readonly RentalDashboardService $rentalDashboardService) {}

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['sometimes', 'string', Rule::in(['30_days', '90_days', '12_months'])],
        ]);

        return response()->json([
            'data' => $this->rentalDashboardService->summary($validated['period'] ?? '12_months'),
        ]);
    }
}
