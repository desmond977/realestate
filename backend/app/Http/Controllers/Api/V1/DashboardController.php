<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AllocationResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\RealtorResource;
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
                'monthly_target' => $summary['monthly_target'],
                'monthly_target_progress' => $summary['monthly_target_progress'],
                'property_status_breakdown' => $summary['property_status_breakdown'],
                'property_inventory_breakdown' => $summary['property_inventory_breakdown'],
                'allocation_status_breakdown' => $summary['allocation_status_breakdown'],
                'recent_payments' => PaymentResource::collection($summary['recent_payments']),
                'recent_allocations' => AllocationResource::collection($summary['recent_allocations']),
                'top_realtors' => RealtorResource::collection($summary['top_realtors']),
            ],
        ]);
    }
}
