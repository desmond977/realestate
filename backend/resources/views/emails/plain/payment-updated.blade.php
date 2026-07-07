Payment Updated

@if($recipientType === 'client')
Hello {{ $payment->client->full_name ?? 'Valued Client' }},

Your payment record has been updated.
@else
Hello Administrative Team,

A payment record has been updated in TerraOps.
@endif

Transaction Details:
- Client: {{ $payment->client->full_name ?? 'N/A' }}
- Property: {{ $payment->property->title ?? 'N/A' }}
- Realtor: {{ $payment->realtor->full_name ?? 'N/A' }}
@if($payment->receipt)
- Receipt Number: {{ $payment->receipt->receipt_number ?? 'N/A' }}
@endif

Important Summary:
- Previous Amount: NGN {{ number_format($oldAmount, 2) }}
- Updated Amount: NGN {{ number_format($payment->amount, 2) }}
- Outstanding Balance: NGN {{ number_format($payment->allocation->balance ?? 0, 2) }}

Regards,
{{ $companyName ?? 'TerraOps' }} Team
