Payment Due Reminder

Hello {{ $allocation->client->full_name ?? 'Valued Client' }},

This is a friendly reminder that your payment for {{ $allocation->property->title ?? 'your property allocation' }} is
@if($daysUntilDue > 0)
due in {{ $daysUntilDue }} day(s)
@else
due today
@endif
.

Status: {{ $daysUntilDue > 0 ? 'Coming Up' : 'Due Today' }}

Please ensure payment is completed by the due date to keep your allocation in good standing.

Transaction Details:
- Property: {{ $allocation->property->title ?? 'N/A' }}
- Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}
- Payment Duration: {{ $allocation->paymentDurationLabel() }}
- Due Date: {{ $dueDate->format('F j, Y') }}

Payment Summary:
- Original Property Price: NGN {{ number_format($allocation->original_price ?? $allocation->total_amount, 2) }}
@if((float) ($allocation->discount_amount ?? 0) > 0)
- Promotional Discount: NGN {{ number_format($allocation->discount_amount, 2) }}{{ $allocation->discount_type === 'percentage' ? ' (' . number_format((float) $allocation->discount_value, 2) . '%)' : '' }}
@endif
- Final Payable Amount: NGN {{ number_format($allocation->total_amount, 2) }}
- Amount Paid: ₦{{ number_format($allocation->amount_paid, 2) }}
- Outstanding Balance: ₦{{ number_format($allocation->balance, 2) }}

If you have already made this payment, please disregard this reminder. Contact us if you have any questions.

Regards,
{{ $companyName ?? 'TerraOps' }} Team
