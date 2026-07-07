<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentStatus;
use App\Http\Resources\ClientResource;
use App\Http\Resources\RealtorResource;
use App\Models\Realtor;

class RealtorAnalyticsService
{
    /**
     * @return array<string, mixed>
     */
    public function overview(Realtor $realtor): array
    {
        $realtor->load([
            'clients',
            'allocations.client',
            'allocations.property',
            'allocations.payments.receipt',
            'payments.property',
            'payments.client',
        ]);

        $clients = $realtor->clients;
        $allocations = $realtor->allocations;
        $payments = $realtor->payments;
        $confirmedPayments = $payments->filter(
            fn ($payment) => ($payment->status?->value ?? $payment->status) === PaymentStatus::Confirmed->value
        );
        $activeAllocations = $allocations->filter(
            fn ($allocation) => ($allocation->status?->value ?? $allocation->status) === AllocationStatus::Active->value
        );
        $completedAllocations = $allocations->filter(
            fn ($allocation) => ($allocation->status?->value ?? $allocation->status) === AllocationStatus::Completed->value
        );

        return [
            'realtor' => new RealtorResource($realtor),
            'summary' => [
                'total_clients' => $clients->count(),
                'total_properties_sold' => $completedAllocations->count(),
                'total_revenue' => (float) $confirmedPayments->sum('amount'),
                'outstanding_balances' => (float) $activeAllocations->sum('balance'),
                'total_installment_payments' => $confirmedPayments->count(),
                'fully_paid_properties_count' => $completedAllocations->count(),
            ],
            'clients' => ClientResource::collection($clients->sortBy('full_name')->values()),
            'connected_clients' => $clients->map(function ($client) use ($allocations) {
                $clientAllocations = $allocations->where('client_id', $client->id);
                $latestAllocation = $clientAllocations->sortByDesc('allocated_at')->first();

                return [
                    'id' => $client->id,
                    'full_name' => $client->full_name,
                    'phone' => $client->phone,
                    'email' => $client->email,
                    'property' => $latestAllocation?->property?->title,
                    'payment_status' => $latestAllocation?->status?->value ?? $latestAllocation?->status ?? 'no allocation',
                    'outstanding_balance' => (float) ($clientAllocations->sum('balance') ?? 0),
                ];
            })->values(),
            'properties' => $allocations->map(fn ($allocation) => [
                    'allocation_id' => $allocation->id,
                    'property_id' => $allocation->property_id,
                    'title' => $allocation->property?->title,
                    'price' => (float) ($allocation->property?->price ?? $allocation->total_amount),
                    'client' => $allocation->client?->full_name,
                    'payment_progress' => $allocation->total_amount > 0
                        ? min(100, (int) round(((float) $allocation->amount_paid / (float) $allocation->total_amount) * 100))
                        : 0,
                    'amount_paid' => (float) $allocation->amount_paid,
                    'balance' => (float) $allocation->balance,
                    'payment_duration' => $allocation->payment_duration,
                    'custom_duration_value' => $allocation->custom_duration_value,
                    'custom_duration_unit' => $allocation->custom_duration_unit,
                    'payment_duration_label' => $allocation->paymentDurationLabel(),
                    'payment_duration_interval' => $allocation->paymentDurationInterval(),
                    'status' => $allocation->status?->value ?? $allocation->status,
                    'latest_receipt' => $allocation->payments
                        ->sortByDesc('paid_at')
                        ->first(fn ($payment) => $payment->receipt)?->receipt?->only(['id', 'receipt_number']),
                ])->values(),
        ];
    }
}
