Outstanding Balance Reminder

Hello {{ $allocation->client->full_name ?? 'Valued Client' }},

This is a reminder that you have an outstanding balance on your property allocation.

Transaction Details:
- Property: {{ $allocation->property->title ?? 'N/A' }}
- Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}
- Payment Duration: {{ $allocation->paymentDurationLabel() }}

Important Summary:
- Original Property Price: NGN {{ number_format($allocation->original_price ?? $allocation->total_amount, 2) }}
@if((float) ($allocation->discount_amount ?? 0) > 0)
- Promotional Discount: NGN {{ number_format($allocation->discount_amount, 2) }}{{ $allocation->discount_type === 'percentage' ? ' (' . number_format((float) $allocation->discount_value, 2) . '%)' : '' }}
@endif
- Final Payable Amount: NGN {{ number_format($allocation->total_amount, 2) }}
- Amount Paid: NGN {{ number_format($allocation->amount_paid, 2) }}
- Outstanding Balance: NGN {{ number_format($allocation->balance, 2) }}

Regards,
{{ $companyName ?? 'TerraOps' }} Team
