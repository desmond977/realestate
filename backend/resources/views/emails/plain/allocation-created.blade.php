{{ $recipientType === 'admin' ? 'New Allocation Created' : 'Allocation Created' }}

@if($recipientType === 'client')
Hello {{ $allocation->client->full_name ?? 'Valued Client' }},

Your property allocation has been successfully created.
@else
Hello Administrative Team,

A new property allocation has been created in TerraOps.
@endif

Transaction Details:
- Client: {{ $allocation->client->full_name ?? 'N/A' }}
- Property: {{ $allocation->property->title ?? 'N/A' }}
- Location: {{ $allocation->property->location ?? 'N/A' }}
- Allocation Reference: {{ $allocation->reference ?? 'N/A' }}
- Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}
- Payment Plan: {{ ucfirst($allocation->payment_plan->value ?? 'installment') }}
- Payment Status: {{ ucfirst($allocation->status->value ?? $allocation->status) }}
- Allocation Date: {{ $allocation->allocated_at ? $allocation->allocated_at->format('M d, Y') : 'N/A' }}

Important Summary:
- Property Price: NGN {{ number_format($allocation->total_amount, 2) }}
- Amount Paid: NGN {{ number_format($allocation->amount_paid, 2) }}
- Outstanding Balance: NGN {{ number_format($allocation->balance, 2) }}

Regards,
{{ $companyName ?? 'TerraOps' }} Team
