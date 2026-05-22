<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReceiptResource;
use App\Models\Receipt;
use App\Services\RealEstate\ReceiptDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ReceiptController extends Controller
{
    public function __construct(private readonly ReceiptDocumentService $receiptDocumentService)
    {
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $receipts = Receipt::query()
            ->with(['payment.client.realtor', 'payment.realtor', 'payment.property', 'payment.allocation', 'issuer'])
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('receipt_number', 'like', "%{$search}%")
                        ->orWhereHas('payment.client', function ($query) use ($search) {
                            $query
                                ->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        })
                        ->orWhereHas('payment.property', function ($query) use ($search) {
                            $query->where('title', 'like', "%{$search}%");
                        });
                });
            })
            ->latest('issued_at')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return ReceiptResource::collection($receipts);
    }

    public function show(Receipt $receipt): JsonResponse
    {
        return response()->json([
            'data' => [
                'receipt' => new ReceiptResource(
                    $receipt->load(['payment.client.realtor', 'payment.realtor', 'payment.property', 'payment.allocation', 'issuer'])
                ),
            ],
        ]);
    }

    public function document(Receipt $receipt): JsonResponse
    {
        return response()->json([
            'data' => $this->receiptDocumentService->build($receipt),
        ]);
    }
}
