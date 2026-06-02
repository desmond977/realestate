{{ $recipientType === 'admin' ? 'Payment Created' : 'Payment Received' }}

@if($recipientType === 'client')
Hello {{ $payment->client->full_name ?? 'Valued Client' }},

Your payment has been successfully received.
@else
Hello Administrative Team,

A payment has been recorded in TerraOps.
@endif

Transaction Details:
- Client: {{ $payment->client->full_name ?? 'N/A' }}
- Property: {{ $payment->property->title ?? 'N/A' }}
- Allocation Reference: {{ $payment->allocation->reference ?? 'N/A' }}
- Realtor: {{ $payment->realtor->full_name ?? 'N/A' }}
- Payment Date: {{ $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : 'N/A' }}
- Payment Method: {{ $payment->payment_method ?? 'N/A' }}
@if($payment->transaction_reference)
- Transaction Reference: {{ $payment->transaction_reference }}
@endif
@if($payment->receipt)
- Receipt Number: {{ $payment->receipt->receipt_number ?? 'N/A' }}
@endif

Important Summary:
- Payment Amount: NGN {{ number_format($payment->amount, 2) }}
- Total Paid So Far: NGN {{ number_format($payment->allocation->amount_paid ?? 0, 2) }}
- Outstanding Balance: NGN {{ number_format($payment->allocation->balance ?? 0, 2) }}

Regards,
{{ $companyName ?? 'TerraOps' }} Team
