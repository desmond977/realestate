@extends('emails.layouts.base')

@section('title', 'Admin Monthly Summary')

@section('content')
<h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; color: #111111;">Admin Monthly Summary</h1>

<p style="margin: 0 0 16px;">Hello Administrative Team,</p>

<p style="margin: 0 0 20px;">Here is the TerraOps performance summary for {{ $summary['month'] ?? now()->format('F Y') }}.</p>

<p style="margin: 0 0 8px; font-weight: bold;">Important Summary:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Total Clients: {{ number_format($summary['total_clients'] ?? 0) }}</li>
    <li>Properties Sold: {{ number_format($summary['total_properties_sold'] ?? 0) }}</li>
    <li>Outstanding Balances: &#8358;{{ number_format($summary['total_outstanding_balances'] ?? 0, 2) }}</li>
    <li>Payments Received: &#8358;{{ number_format($summary['total_payments_received'] ?? 0, 2) }}</li>
    <li>New Allocations This Month: {{ number_format($summary['new_allocations_this_month'] ?? 0) }}</li>
</ul>

<p style="margin: 0;">Please review TerraOps for detailed records where needed.</p>
@endsection
