<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentStatus;
use App\Http\Resources\AllocationResource;
use App\Http\Resources\ClientResource;
use App\Http\Resources\PaymentResource;
use App\Http\Resources\PropertyResource;
use App\Http\Resources\ReceiptResource;
use App\Models\Client;
use Illuminate\Support\Collection;

class ClientActivityService
{
    /**
     * @return array<string, mixed>
     */
    public function overview(Client $client): array
    {
        $client->load([
            'allocations.property',
            'allocations.payments.receipt',
            'payments.allocation.property',
            'payments.property',
            'payments.receipt.issuer',
            'receipts.payment.property',
            'receipts.payment.allocation',
        ]);

        $confirmedPayments = $client->payments->filter(
            fn ($payment) => ($payment->status?->value ?? $payment->status) === PaymentStatus::Confirmed->value
        );

        $activeAllocations = $client->allocations->filter(
            fn ($allocation) => ($allocation->status?->value ?? $allocation->status) === AllocationStatus::Active->value
        );

        $properties = $client->allocations
            ->pluck('property')
            ->filter()
            ->unique('id')
            ->values();

        return [
            'client' => new ClientResource($client),
            'summary' => [
                'allocated_properties' => $properties->count(),
                'total_allocations' => $client->allocations->count(),
                'active_allocations' => $activeAllocations->count(),
                'completed_allocations' => $client->allocations->filter(
                    fn ($allocation) => ($allocation->status?->value ?? $allocation->status) === AllocationStatus::Completed->value
                )->count(),
                'total_amount_paid' => (float) $confirmedPayments->sum('amount'),
                'outstanding_balance' => (float) $activeAllocations->sum('balance'),
                'receipts_generated' => $client->receipts->count(),
            ],
            'properties' => PropertyResource::collection($properties),
            'allocations' => AllocationResource::collection($client->allocations->sortByDesc('allocated_at')->values()),
            'payments' => PaymentResource::collection($client->payments->sortByDesc('paid_at')->values()),
            'installments' => $this->installmentHistory($client),
            'receipts' => ReceiptResource::collection($client->receipts->sortByDesc('issued_at')->values()),
            'recent_activities' => $this->recentActivities($client),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function installmentHistory(Client $client): array
    {
        return $client->allocations
            ->map(fn ($allocation) => [
                'allocation_id' => $allocation->id,
                'property' => $allocation->property?->title,
                'payment_plan' => $allocation->payment_plan?->value ?? $allocation->payment_plan,
                'status' => $allocation->status?->value ?? $allocation->status,
                'total_amount' => (float) $allocation->total_amount,
                'amount_paid' => (float) $allocation->amount_paid,
                'balance' => (float) $allocation->balance,
                'payments_count' => $allocation->payments->count(),
                'payments' => PaymentResource::collection($allocation->payments->sortByDesc('paid_at')->values()),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentActivities(Client $client): array
    {
        $allocations = $client->allocations->map(fn ($allocation) => [
            'type' => 'allocation',
            'label' => 'Property allocated',
            'description' => $allocation->property?->title ?? 'Allocation created',
            'amount' => (float) $allocation->total_amount,
            'occurred_at' => $allocation->allocated_at?->toISOString() ?? $allocation->created_at?->toISOString(),
        ]);

        $payments = $client->payments->map(fn ($payment) => [
            'type' => 'payment',
            'label' => 'Payment recorded',
            'description' => $payment->property?->title ?? 'Payment received',
            'amount' => (float) $payment->amount,
            'occurred_at' => $payment->paid_at?->toISOString() ?? $payment->created_at?->toISOString(),
        ]);

        $receipts = $client->receipts->map(fn ($receipt) => [
            'type' => 'receipt',
            'label' => 'Receipt generated',
            'description' => $receipt->receipt_number,
            'amount' => (float) ($receipt->payment?->amount ?? 0),
            'occurred_at' => $receipt->issued_at?->toISOString() ?? $receipt->created_at?->toISOString(),
        ]);

        return Collection::make()
            ->merge($allocations)
            ->merge($payments)
            ->merge($receipts)
            ->sortByDesc('occurred_at')
            ->take(10)
            ->values()
            ->all();
    }
}
