<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\PropertyResource;
use App\Services\ClientDashboardService;
use Illuminate\Http\Request;

class PropertyController extends Controller
{
    /**
     * Get all properties allocated to the client
     */
    public function index(Request $request)
    {
        $client = $request->user();
        $service = new ClientDashboardService($client);

        $allocations = $service->getAllocations();

        $properties = $allocations->map(fn($allocation) => [
            'allocation_id' => $allocation->id,
            'allocation_reference' => $allocation->reference,
            'allocation_status' => $allocation->status,
            'allocated_at' => $allocation->allocated_at?->toDateTimeString(),
            'property' => new PropertyResource($allocation->property),
            'payment_progress' => $allocation->paymentProgress(),
            'paid_amount' => $allocation->paidAmount(),
            'outstanding_amount' => $allocation->outstandingAmount(),
            'total_amount' => $allocation->total_amount,
        ]);

        return response()->json([
            'properties' => $properties,
            'total' => $properties->count(),
        ]);
    }

    /**
     * Get a specific property allocated to the client
     */
    public function show(Request $request, $allocationId)
    {
        $client = $request->user();

        $allocation = $client->allocations()
            ->with('property')
            ->findOrFail($allocationId);

        return response()->json([
            'allocation' => [
                'id' => $allocation->id,
                'reference' => $allocation->reference,
                'status' => $allocation->status,
                'total_amount' => $allocation->total_amount,
                'paid_amount' => $allocation->paidAmount(),
                'outstanding_amount' => $allocation->outstandingAmount(),
                'payment_progress' => $allocation->paymentProgress(),
                'allocated_at' => $allocation->allocated_at?->toDateTimeString(),
                'expected_completion' => $allocation->expected_completion?->toDateTimeString(),
            ],
            'property' => new PropertyResource($allocation->property),
        ]);
    }
}
