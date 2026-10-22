<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PaymentProofSubmissionStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentProofSubmissionResource;
use App\Models\PaymentProofSubmission;
use App\Models\User;
use App\Services\RealEstate\PaymentProofReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class PaymentApprovalController extends Controller
{
    public function __construct(private readonly PaymentProofReviewService $reviewService) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(PaymentProofSubmissionStatus::values())],
            'payment_category' => ['sometimes', 'string', Rule::in(['rental', 'service_charge'])],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $submissions = PaymentProofSubmission::query()
            ->with([
                'client',
                'reviewer',
                'rentalPaymentPeriod.rentalAgreement.client',
                'rentalPaymentPeriod.rentalAgreement.rentalProperty.property',
                'serviceCharge.category',
                'serviceCharge.client',
                'serviceCharge.rentalAgreement.rentalProperty.property',
                'serviceCharge.rentalProperty.property',
                'rentalPayment.receipt',
                'serviceChargePayment.receipt',
            ])
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when(
                $validated['payment_category'] ?? null,
                fn ($query, string $category) => $query->where('payment_category', $category)
            )
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('transaction_reference', 'like', "%{$search}%")
                        ->orWhereHas('client', fn ($client) => $client
                            ->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('rentalPaymentPeriod.rentalAgreement.rentalProperty', fn ($property) => $property
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('location', 'like', "%{$search}%"))
                        ->orWhereHas('serviceCharge.rentalProperty', fn ($property) => $property
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('location', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate($validated['per_page'] ?? 20)
            ->withQueryString();

        return response()->json([
            'data' => PaymentProofSubmissionResource::collection($submissions->items()),
            'meta' => [
                'current_page' => $submissions->currentPage(),
                'last_page' => $submissions->lastPage(),
                'per_page' => $submissions->perPage(),
                'total' => $submissions->total(),
            ],
        ]);
    }

    public function approve(Request $request, PaymentProofSubmission $submission): JsonResponse
    {
        $approved = $this->reviewService->approve($submission, $this->admin($request));

        return response()->json([
            'message' => 'Payment proof approved and payment recorded.',
            'data' => new PaymentProofSubmissionResource($approved),
        ]);
    }

    public function reject(Request $request, PaymentProofSubmission $submission): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:2000'],
        ]);
        $rejected = $this->reviewService->reject(
            $submission,
            $this->admin($request),
            trim($validated['rejection_reason'])
        );

        return response()->json([
            'message' => 'Payment proof rejected.',
            'data' => new PaymentProofSubmissionResource($rejected),
        ]);
    }

    public function proof(PaymentProofSubmission $submission): BinaryFileResponse
    {
        $path = $submission->proof_of_payment_path;
        abort_unless(
            str_starts_with($path, "payment-proofs/{$submission->client_id}/")
                && ! str_contains($path, '..')
                && ! str_contains($path, '\\')
                && Storage::disk('local')->exists($path),
            404
        );

        $mimeType = Storage::disk('local')->mimeType($path);
        abort_unless(in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], true), 404);

        return response()->file(Storage::disk('local')->path($path), [
            'Content-Type' => $mimeType,
            'Content-Disposition' => 'inline; filename="payment-proof-'.$submission->id.'"',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function admin(Request $request): User
    {
        $user = $request->user();

        abort_unless($user instanceof User && $user->role?->value === 'admin', 403);

        return $user;
    }
}
