<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Services\ClientDashboardService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * Get all payments for the client
     */
    public function index(Request $request)
    {
        $client = $request->user();
        $service = new ClientDashboardService($client);

        $paymentHistory = $service->getPaymentHistory();

        return response()->json([
            'payments' => PaymentResource::collection($paymentHistory['payments']),
            'status_breakdown' => $paymentHistory['status_breakdown'],
            'total_paid' => $paymentHistory['total_paid'],
            'total_pending' => $paymentHistory['total_pending'],
            'total' => $paymentHistory['payments']->count(),
        ]);
    }

    /**
     * Get a specific payment
     */
    public function show(Request $request, $paymentId)
    {
        $client = $request->user();

        $payment = $client->payments()
            ->with(['allocation.property', 'receipt'])
            ->findOrFail($paymentId);

        return response()->json([
            'payment' => new PaymentResource($payment),
        ]);
    }

    /**
     * Get upcoming payments
     */
    public function upcoming(Request $request)
    {
        $client = $request->user();

        $payments = $client->payments()
            ->with(['allocation.property'])
            ->where('status', 'pending')
            ->latest()
            ->get();

        return response()->json([
            'payments' => PaymentResource::collection($payments),
            'total' => $payments->count(),
            'total_amount' => $payments->sum('amount'),
        ]);
    }

    /**
     * Get overdue payments
     */
    public function overdue(Request $request)
    {
        $client = $request->user();

        $payments = collect();

        return response()->json([
            'payments' => PaymentResource::collection($payments),
            'total' => $payments->count(),
            'total_amount' => $payments->sum('amount'),
        ]);
    }
}
