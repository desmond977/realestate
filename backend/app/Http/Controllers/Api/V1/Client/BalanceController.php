<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Services\ClientDashboardService;
use Illuminate\Http\Request;

class BalanceController extends Controller
{
    /**
     * Get outstanding balances for the client
     */
    public function index(Request $request)
    {
        $client = $request->user();
        $service = new ClientDashboardService($client);

        $balances = $service->getOutstandingBalances();

        return response()->json([
            'balances' => $balances,
        ]);
    }

    /**
     * Get balance summary
     */
    public function summary(Request $request)
    {
        $client = $request->user();

        return response()->json([
            'total_outstanding' => $client->outstandingBalance(),
            'total_paid' => $client->totalPaid(),
            'payment_progress' => $client->paymentProgress(),
            'has_outstanding_balance' => $client->hasOutstandingBalance(),
            'overdue_payments_count' => 0,
        ]);
    }
}
