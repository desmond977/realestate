<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClientDashboardResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\ReceiptResource;
use App\Services\ClientDashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Get client dashboard data
     */
    public function index(Request $request)
    {
        $client = $request->user();
        $service = new ClientDashboardService($client);

        $summary = $service->getDashboardSummary();
        $recentPayments = $service->getRecentPayments();
        $recentReceipts = $service->getRecentReceipts();
        $realtors = $service->getRealtorRelationships();

        $client->setAttribute('_dashboard_payload', [
            'summary' => [
                'total_properties' => $summary['total_properties'],
                'total_paid' => $summary['total_paid'],
                'outstanding_balance' => $summary['outstanding_balance'],
                'payment_progress' => $summary['payment_progress'],
                'active_allocations' => $summary['active_allocations'],
            ],
            'recent_payments' => $recentPayments,
            'recent_receipts' => $recentReceipts,
        ]);

        return response()->json([
            'user' => new ClientDashboardResource($client),
            'summary' => $summary,
            'recent_payments' => PaymentResource::collection($recentPayments),
            'recent_receipts' => ReceiptResource::collection($recentReceipts),
            'realtors' => $realtors->map(fn ($r) => [
                'id' => $r->id,
                'name' => $r->full_name,
                'email' => $r->email,
                'phone' => $r->phone,
                'company_name' => $r->company_name,
                'assigned_at' => $r->pivot?->assigned_at?->toDateTimeString(),
            ]),
        ]);
    }

    /**
     * Get dashboard summary only
     */
    public function summary(Request $request)
    {
        $client = $request->user();
        $service = new ClientDashboardService($client);

        return response()->json([
            'summary' => $service->getDashboardSummary(),
        ]);
    }
}
