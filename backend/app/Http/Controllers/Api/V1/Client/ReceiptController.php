<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReceiptResource;
use App\Models\CompanySetting;
use App\Models\Receipt;
use App\Services\RealEstate\ReceiptDocumentService;
use App\Services\ClientDashboardService;
use Illuminate\Http\Request;

class ReceiptController extends Controller
{
    public function __construct(private readonly ReceiptDocumentService $receiptDocumentService)
    {
    }

    /**
     * Get all receipts for the client
     */
    public function index(Request $request)
    {
        $client = $request->user();
        $service = new ClientDashboardService($client);

        $receipts = $service->getReceipts();

        return response()->json([
            'receipts' => ReceiptResource::collection($receipts),
            'total' => $receipts->count(),
        ]);
    }

    /**
     * Get a specific receipt
     */
    public function show(Request $request, $receiptId)
    {
        $client = $request->user();

        $receipt = $client->receipts()
            ->with(['payment.client', 'payment.property', 'payment.allocation.property'])
            ->findOrFail($receiptId);

        return response()->json([
            'receipt' => new ReceiptResource($receipt),
        ]);
    }

    /**
     * Download receipt as PDF
     */
    public function downloadPdf(Request $request, $receiptId)
    {
        $client = $request->user();

        $receipt = $client->receipts()
            ->with(['payment.client', 'payment.property', 'payment.allocation.property'])
            ->findOrFail($receiptId);

        $documentData = $this->receiptDocumentService->build($receipt);
        $company = CompanySetting::query()->first();
        $document = view('client.receipts.document', compact('receipt', 'company', 'documentData'))->render();

        return response($document)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="receipt_' . $receipt->receipt_number . '.html"');
    }

    /**
     * Get the same receipt document used by the admin portal.
     */
    public function document(Request $request, $receiptId)
    {
        $client = $request->user();

        $receipt = $client->receipts()->findOrFail($receiptId);

        return response()->json([
            'data' => $this->receiptDocumentService->build($receipt),
        ]);
    }
}
