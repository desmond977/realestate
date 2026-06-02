Happy New Month from TerraOps

Hello {{ $client->full_name ?? 'Valued Client' }},

Thank you for being a valued client of {{ $companyName ?? 'TerraOps' }}.

We appreciate your trust in us and remain committed to keeping your property records and payment updates clear and accurate.

@if($outstandingBalance !== null && $outstandingBalance > 0)
Outstanding Balance:
@forelse($outstandingAllocations as $allocation)
- Property: {{ data_get($allocation, 'property.title', 'N/A') }}
  Amount Paid: NGN {{ number_format(data_get($allocation, 'amount_paid', 0), 2) }}
  Remaining Balance: NGN {{ number_format(data_get($allocation, 'balance', 0), 2) }}
@empty
- Total Outstanding Balance: NGN {{ number_format($outstandingBalance, 2) }}
@endforelse
@else
Your account is currently up to date.
@endif

Regards,
{{ $companyName ?? 'TerraOps' }} Team
