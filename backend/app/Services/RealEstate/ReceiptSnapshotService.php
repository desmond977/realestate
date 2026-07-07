<?php

namespace App\Services\RealEstate;

use App\Enums\AllocationStatus;
use App\Enums\PaymentStatus;
use App\Models\CompanySetting;
use App\Models\Payment;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class ReceiptSnapshotService
{
    /**
     * @return array<string, mixed>
     */
    public function build(Payment $payment, string $receiptNumber, CarbonInterface $issuedAt, ?User $issuer = null): array
    {
        $payment->loadMissing([
            'client.realtor',
            'realtor',
            'property',
            'allocation.client.realtor',
            'allocation.realtor',
            'allocation.property',
            'allocation.payments.receipt',
        ]);

        $allocation = $payment->allocation;
        $client = $payment->client ?? $allocation?->client;
        $realtor = $payment->realtor ?? $client?->realtor ?? $allocation?->realtor;
        $property = $payment->property ?? $allocation?->property;
        $history = $this->historyFor($payment);
        $confirmedPayments = $history->filter(
            fn ($item) => ($item->status?->value ?? $item->status) === PaymentStatus::Confirmed->value
        );

        $totalAmount = (float) ($allocation?->total_amount ?? $property?->price ?? $payment->amount ?? 0);
        $totalPaid = (float) ($allocation?->amount_paid ?? $confirmedPayments->sum('amount'));
        $balance = (float) ($allocation?->balance ?? max($totalAmount - $totalPaid, 0));
        $progress = $totalAmount > 0 ? min(100, (int) round(($totalPaid / $totalAmount) * 100)) : 100;
        $paymentType = $payment->payment_type?->value ?? $payment->payment_type ?? null;
        $allocationStatus = $allocation?->status?->value ?? $allocation?->status ?? null;
        $paymentStatus = $balance <= 0 ? 'fully_paid' : ($paymentType ?: 'installment');
        $company = $this->company();

        return [
            'document_type' => $this->documentType($paymentType, $balance, $allocationStatus),
            'company' => $company,
            'receipt' => [
                'number' => $receiptNumber,
                'issued_at' => $issuedAt->toISOString(),
                'generated_at' => $issuedAt->toISOString(),
                'generated_by' => $issuer?->name,
            ],
            'client' => [
                'id' => $client?->id,
                'full_name' => $client?->full_name,
                'phone' => $client?->phone,
                'email' => $client?->email,
                'address' => $client?->address,
            ],
            'realtor' => [
                'id' => $realtor?->id,
                'full_name' => $realtor?->full_name,
                'phone' => $realtor?->phone,
                'email' => $realtor?->email,
                'company_name' => $realtor?->company_name,
            ],
            'property' => [
                'id' => $property?->id,
                'title' => $property?->title,
                'type' => $property?->type,
                'land_size' => $property?->land_size,
                'location' => $property?->location,
                'document_type' => $property?->document_type,
                'price' => (float) ($property?->price ?? $totalAmount),
                'status' => $property?->status?->value ?? $property?->status,
            ],
            'allocation' => [
                'id' => $allocation?->id,
                'reference' => $allocation ? sprintf('ALLOC-%06d', $allocation->id) : null,
                'allocated_at' => $allocation?->allocated_at?->toDateString(),
                'status' => $allocationStatus,
                'total_amount' => $totalAmount,
                'amount_paid' => $totalPaid,
                'balance' => $balance,
                'payment_duration' => $allocation?->payment_duration,
                'custom_duration_value' => $allocation?->custom_duration_value,
                'custom_duration_unit' => $allocation?->custom_duration_unit,
                'payment_duration_label' => $allocation?->paymentDurationLabel(),
                'payment_duration_interval' => $allocation?->paymentDurationInterval(),
            ],
            'payment' => [
                'id' => $payment->id,
                'type' => $paymentType,
                'amount' => (float) $payment->amount,
                'status' => $payment->status?->value ?? $payment->status,
                'payment_status' => $paymentStatus,
                'method' => $payment->payment_method,
                'reference' => $payment->transaction_reference,
                'paid_at' => $payment->paid_at?->toISOString(),
                'notes' => $payment->notes,
            ],
            'installment_summary' => [
                'total_paid' => $totalPaid,
                'remaining_balance' => $balance,
                'total_amount' => $totalAmount,
                'payments_count' => $history->count(),
                'progress_percentage' => $progress,
                'label' => sprintf('%s / %s Paid', number_format($totalPaid, 2), number_format($totalAmount, 2)),
            ],
            'payment_history' => $history->map(fn ($item) => [
                'id' => $item->id,
                'date' => $item->paid_at?->toISOString(),
                'amount' => (float) $item->amount,
                'method' => $item->payment_method,
                'reference' => $item->transaction_reference,
                'status' => $item->status?->value ?? $item->status,
                'receipt_number' => $item->id === $payment->id
                    ? $receiptNumber
                    : $item->receipt?->receipt_number,
            ])->values()->all(),
            'notes' => [
                'Thank you for your payment.',
                'This document was auto-generated by ' . $company['name'] . ' and is valid without a physical stamp.',
                'All allocations remain subject to company verification and documented payment clearance.',
            ],
        ];
    }

    /**
     * @return Collection<int, Payment>
     */
    private function historyFor(Payment $payment): Collection
    {
        if (! $payment->allocation) {
            return collect([$payment]);
        }

        return $payment->allocation->payments
            ->filter(fn ($item) => $item->id <= $payment->id)
            ->sortBy('paid_at')
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private function company(): array
    {
        return app(\App\Services\CompanySettings::class)->get();
    }

    private function documentType(?string $paymentType, float $balance, ?string $allocationStatus): string
    {
        if ($allocationStatus === AllocationStatus::Completed->value || $balance <= 0) {
            return 'Full payment receipt';
        }

        if ($paymentType) {
            return $paymentType === 'full' ? 'Full payment receipt' : 'Installment payment receipt';
        }

        return 'Transaction summary';
    }
}
