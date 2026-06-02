Admin Monthly Summary

Hello Administrative Team,

Here is the TerraOps performance summary for {{ $summary['month'] ?? now()->format('F Y') }}.

Important Summary:
- Total Clients: {{ number_format($summary['total_clients'] ?? 0) }}
- Properties Sold: {{ number_format($summary['total_properties_sold'] ?? 0) }}
- Outstanding Balances: NGN {{ number_format($summary['total_outstanding_balances'] ?? 0, 2) }}
- Payments Received: NGN {{ number_format($summary['total_payments_received'] ?? 0, 2) }}
- New Allocations This Month: {{ number_format($summary['new_allocations_this_month'] ?? 0) }}

Regards,
{{ $companyName ?? 'TerraOps' }} Team
