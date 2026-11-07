<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Enums\RentalPaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\RentalPaymentPeriodResource;
use App\Models\RentalPaymentPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RentalPaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $periods = RentalPaymentPeriod::query()
            ->whereHas('rentalAgreement', fn ($query) => $query->where('client_id', $request->user()->id))
            ->with([
                'rentalAgreement.client',
                'rentalAgreement.rentalProperty.property',
                'payments' => fn ($query) => $query
                    ->where('status', RentalPaymentStatus::Confirmed->value)
                    ->with('receipt')
                    ->orderByDesc('paid_at'),
            ])
            ->withSum([
                'payments as amount_paid' => fn ($query) => $query->where('status', RentalPaymentStatus::Confirmed->value),
            ], 'amount')
            ->orderByDesc('period_start')
            ->limit(300)
            ->get()
            ->unique(fn ($period) => sprintf('%s|%s|%s|%s', $period->rental_agreement_id, $period->rentalAgreement?->rental_property_id ?? 'none', $period->period_start?->toDateString() ?? '', $period->period_end?->toDateString() ?? ''))
            ->values();

        $periods->each(fn ($period) => $period->setAttribute('amount_paid', (float) ($period->amount_paid ?? 0)));

        return response()->json([
            'data' => [
                'periods' => RentalPaymentPeriodResource::collection($periods),
                'total_due' => (float) $periods->sum('amount_due'),
                'total_paid' => (float) $periods->sum('amount_paid'),
                'outstanding' => (float) $periods->sum(fn ($period) => max(0, (float) $period->amount_due - (float) ($period->amount_paid ?? 0))),
            ],
        ]);
    }
}
