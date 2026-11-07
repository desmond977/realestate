<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Enums\PaymentProofSubmissionStatus;
use App\Enums\RentalPaymentStatus;
use App\Enums\RentalStatus;
use App\Enums\ServiceChargePaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentProofSubmissionResource;
use App\Models\Client;
use App\Models\PaymentProofSubmission;
use App\Models\RentalPayment;
use App\Models\RentalPaymentPeriod;
use App\Models\ServiceCharge;
use App\Models\ServiceChargePayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class PaymentProofSubmissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $submissions = PaymentProofSubmission::query()
            ->where('client_id', $request->user()->id)
            ->with([
                'rentalPaymentPeriod.rentalAgreement.rentalProperty.property',
                'serviceCharge.category',
                'serviceCharge.rentalProperty.property',
            ])
            ->latest()
            ->paginate(20);

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

    public function options(Request $request): JsonResponse
    {
        $clientId = $request->user()->id;
        $periods = RentalPaymentPeriod::query()
            ->whereHas('rentalAgreement', fn ($query) => $query
                ->where('client_id', $clientId)
                ->where('status', RentalStatus::Active->value))
            ->withSum([
                'payments as confirmed_amount_paid' => fn ($query) => $query
                    ->where('status', RentalPaymentStatus::Confirmed->value),
            ], 'amount')
            ->withSum([
                'paymentProofSubmissions as pending_submissions_amount' => fn ($query) => $query
                    ->where('status', PaymentProofSubmissionStatus::Pending->value),
            ], 'amount')
            ->with('rentalAgreement.rentalProperty.property')
            ->orderByDesc('due_date')
            ->limit(200)
            ->get()
            ->unique(fn (RentalPaymentPeriod $period) => sprintf('%s|%s|%s|%s', $period->rental_agreement_id, $period->rentalAgreement?->rental_property_id ?? 'none', $period->period_start?->toDateString() ?? '', $period->period_end?->toDateString() ?? ''))
            ->values()
            ->map(function (RentalPaymentPeriod $period) {
                $rentalProperty = $period->rentalAgreement?->rentalProperty;

                return [
                    'id' => $period->id,
                    'period_start' => $period->period_start->toDateString(),
                    'period_end' => $period->period_end->toDateString(),
                    'due_date' => $period->due_date->toDateString(),
                    'amount_due' => (float) $period->amount_due,
                    'available_amount' => $this->availableAmount(
                        $period->amount_due,
                        $period->confirmed_amount_paid,
                        $period->pending_submissions_amount
                    ),
                    'property_name' => $rentalProperty?->name ?: $rentalProperty?->property?->title,
                ];
            })
            ->filter(fn (array $period) => $period['available_amount'] > 0)
            ->values();

        $charges = ServiceCharge::query()
            ->where('client_id', $clientId)
            ->withSum([
                'payments as confirmed_amount_paid' => fn ($query) => $query
                    ->where('status', ServiceChargePaymentStatus::Confirmed->value),
            ], 'amount')
            ->withSum([
                'paymentProofSubmissions as pending_submissions_amount' => fn ($query) => $query
                    ->where('status', PaymentProofSubmissionStatus::Pending->value),
            ], 'amount')
            ->with(['category', 'rentalProperty.property'])
            ->orderByDesc('due_date')
            ->get()
            ->map(function (ServiceCharge $charge) {
                $rentalProperty = $charge->rentalProperty;

                return [
                    'id' => $charge->id,
                    'description' => $charge->description,
                    'category' => $charge->category?->name,
                    'billing_month' => $charge->billing_month ?: $charge->billing_period_start?->format('Y-m'),
                    'due_date' => $charge->due_date->toDateString(),
                    'amount_due' => (float) $charge->amount_due,
                    'available_amount' => $this->availableAmount(
                        $charge->amount_due,
                        $charge->confirmed_amount_paid,
                        $charge->pending_submissions_amount
                    ),
                    'property_name' => $rentalProperty?->name ?: $rentalProperty?->property?->title,
                ];
            })
            ->filter(fn (array $charge) => $charge['available_amount'] > 0)
            ->values();

        return response()->json([
            'data' => [
                'rental_payment_periods' => $periods,
                'service_charges' => $charges,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_category' => ['required', 'string', Rule::in(['rental', 'service_charge'])],
            'rental_payment_period_id' => ['required_if:payment_category,rental', 'prohibited_unless:payment_category,rental', 'integer'],
            'service_charge_id' => ['required_if:payment_category,service_charge', 'prohibited_unless:payment_category,service_charge', 'integer'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999.99'],
            'paid_at' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'transaction_reference' => ['required', 'string', 'max:255'],
            'proof_of_payment' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $client = $request->user();
        $storedPath = null;

        try {
            $submission = DB::transaction(function () use ($client, $validated, $request, &$storedPath) {
                Client::query()->whereKey($client->id)->lockForUpdate()->firstOrFail();

                $duplicate = PaymentProofSubmission::query()
                    ->where('client_id', $client->id)
                    ->where('payment_category', $validated['payment_category'])
                    ->where('transaction_reference', $validated['transaction_reference'])
                    ->exists();
                $alreadyRecorded = $validated['payment_category'] === 'rental'
                    ? RentalPayment::query()->where('transaction_reference', $validated['transaction_reference'])->exists()
                    : ServiceChargePayment::query()->where('transaction_reference', $validated['transaction_reference'])->exists();

                if ($duplicate || $alreadyRecorded) {
                    throw ValidationException::withMessages([
                        'transaction_reference' => ['This transaction reference has already been submitted.'],
                    ]);
                }

                $period = null;
                $charge = null;

                if ($validated['payment_category'] === 'rental') {
                    $period = RentalPaymentPeriod::query()
                        ->whereKey($validated['rental_payment_period_id'])
                        ->whereHas('rentalAgreement', fn ($query) => $query
                            ->where('client_id', $client->id)
                            ->where('status', RentalStatus::Active->value))
                        ->lockForUpdate()
                        ->firstOrFail();
                    $confirmedPaid = $period->payments()
                        ->where('status', RentalPaymentStatus::Confirmed->value)
                        ->sum('amount');
                    $pendingSubmitted = $period->paymentProofSubmissions()
                        ->where('status', PaymentProofSubmissionStatus::Pending->value)
                        ->sum('amount');
                    $this->assertWithinBalance($validated['amount'], $period->amount_due, $confirmedPaid, $pendingSubmitted);
                } else {
                    $charge = ServiceCharge::query()
                        ->whereKey($validated['service_charge_id'])
                        ->where('client_id', $client->id)
                        ->lockForUpdate()
                        ->firstOrFail();
                    $confirmedPaid = $charge->payments()
                        ->where('status', ServiceChargePaymentStatus::Confirmed->value)
                        ->sum('amount');
                    $pendingSubmitted = $charge->paymentProofSubmissions()
                        ->where('status', PaymentProofSubmissionStatus::Pending->value)
                        ->sum('amount');
                    $this->assertWithinBalance($validated['amount'], $charge->amount_due, $confirmedPaid, $pendingSubmitted);
                }

                $storedPath = $request->file('proof_of_payment')->store("payment-proofs/{$client->id}", 'local');

                if (! is_string($storedPath) || $storedPath === '') {
                    throw new \RuntimeException('Payment evidence could not be stored.');
                }

                return PaymentProofSubmission::query()->create([
                    'client_id' => $client->id,
                    'payment_category' => $validated['payment_category'],
                    'rental_payment_period_id' => $period?->id,
                    'service_charge_id' => $charge?->id,
                    'amount' => $validated['amount'],
                    'paid_at' => $validated['paid_at'],
                    'transaction_reference' => $validated['transaction_reference'],
                    'proof_of_payment_path' => $storedPath,
                    'status' => PaymentProofSubmissionStatus::Pending,
                ]);
            });
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('local')->delete($storedPath);
            }

            throw $exception;
        }

        return response()->json([
            'message' => 'Payment proof submitted for review.',
            'data' => new PaymentProofSubmissionResource($submission->load([
                'rentalPaymentPeriod.rentalAgreement.rentalProperty.property',
                'serviceCharge.category',
                'serviceCharge.rentalProperty.property',
            ])),
        ], 201);
    }

    public function proof(Request $request, int $submissionId): StreamedResponse
    {
        $submission = PaymentProofSubmission::query()
            ->where('client_id', $request->user()->id)
            ->findOrFail($submissionId);

        abort_unless(
            str_starts_with($submission->proof_of_payment_path, "payment-proofs/{$submission->client_id}/")
                && Storage::disk('local')->exists($submission->proof_of_payment_path),
            404
        );

        return Storage::disk('local')->download(
            $submission->proof_of_payment_path,
            basename($submission->proof_of_payment_path)
        );
    }

    private function assertWithinBalance(mixed $amount, mixed $amountDue, mixed $confirmedPaid, mixed $pendingSubmitted): void
    {
        $toCents = static fn (mixed $value): int => (int) round((float) $value * 100);
        $availableCents = max(0, $toCents($amountDue) - $toCents($confirmedPaid) - $toCents($pendingSubmitted));

        if ($toCents($amount) > $availableCents) {
            throw ValidationException::withMessages([
                'amount' => ['The submitted amount exceeds the remaining balance after confirmed payments and pending submissions.'],
            ]);
        }
    }

    private function availableAmount(mixed $amountDue, mixed $confirmedPaid, mixed $pendingSubmitted): float
    {
        return max(0, round(
            (float) $amountDue - (float) $confirmedPaid - (float) $pendingSubmitted,
            2
        ));
    }
}
