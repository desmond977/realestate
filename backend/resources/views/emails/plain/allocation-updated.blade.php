Allocation Updated

@if($recipientType === 'client')
Hello {{ $allocation->client->full_name ?? 'Valued Client' }},

Your property allocation has been updated.
@else
Hello Administrative Team,

A property allocation has been updated in TerraOps.
@endif

Transaction Details:
- Client: {{ $allocation->client->full_name ?? 'N/A' }}
- Property: {{ $allocation->property->title ?? 'N/A' }}
- Allocation Reference: {{ $allocation->reference ?? 'N/A' }}
- Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}
- Allocation Date: {{ $allocation->allocated_at?->format('M d, Y') ?? 'N/A' }}

Important Summary:
- Previous Status: {{ ucfirst($previousStatus) }}
- Current Status: {{ ucfirst($allocation->status->value ?? $allocation->status) }}
- Previous Paid Amount: NGN {{ number_format($previousAmountPaid, 2) }}
- Current Amount Paid: NGN {{ number_format($allocation->amount_paid, 2) }}
- Outstanding Balance: NGN {{ number_format($allocation->balance, 2) }}

Regards,
{{ $companyName ?? 'TerraOps' }} Team
