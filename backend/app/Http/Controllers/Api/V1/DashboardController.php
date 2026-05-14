<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AllocationResource;
use App\Http\Resources\PaymentResource;
use App\Services\Dashboard\DashboardService;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboardService)
    {
    }

    public function __invoke(): JsonResponse
    {
        $summary = $this->dashboardService->summary();

        return response()->json([
            'data' => [
                'stats' => $summary['stats'],
                'property_status_breakdown' => $summary['property_status_breakdown'],
                'allocation_status_breakdown' => $summary['allocation_status_breakdown'],
                'recent_payments' => PaymentResource::collection($summary['recent_payments']),
                'recent_allocations' => AllocationResource::collection($summary['recent_allocations']),
            ],
        ]);
    }
}
