Outstanding Balance Reminder

Hello {{ $allocation->client->full_name ?? 'Valued Client' }},

This is a reminder that you have an outstanding balance on your property allocation.

Transaction Details:
- Property: {{ $allocation->property->title ?? 'N/A' }}
- Allocation Reference: {{ $allocation->reference ?? 'N/A' }}
- Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}

Important Summary:
- Property Price: NGN {{ number_format($allocation->total_amount, 2) }}
- Amount Paid: NGN {{ number_format($allocation->amount_paid, 2) }}
- Outstanding Balance: NGN {{ number_format($allocation->balance, 2) }}

Regards,
{{ $companyName ?? 'TerraOps' }} Team
