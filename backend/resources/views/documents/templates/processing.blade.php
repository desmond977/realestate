@extends('documents.layout')

@section('content')
    <h1>Processing Letter</h1>

    <p>
        This letter confirms that {{ $data['company_name'] }} has started processing the allocation
        record for {{ $data['customer_name'] ?? 'the customer' }}.
    </p>

    <div class="meta-grid">
        <div class="meta-row"><div class="meta-label">Customer</div><div class="meta-value">{{ $data['customer_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Phone</div><div class="meta-value">{{ $data['phone'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Property</div><div class="meta-value">{{ $data['property_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Estate / Location</div><div class="meta-value">{{ $data['estate'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Plot Number</div><div class="meta-value">{{ $data['plot_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Allocation Number</div><div class="meta-value">{{ $data['allocation_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Latest Payment</div><div class="meta-value">{{ $data['payment_amount'] }}</div></div>
    </div>

    <p>
        Processing will continue in line with the customer's payment status, allocation details,
        and the internal approval procedure of {{ $data['company_name'] }}.
    </p>

    <div class="signature-grid">
        <div class="signature">Processing Officer</div>
        <div class="signature-spacer"></div>
        <div class="signature">Authorized Approval</div>
    </div>
@endsection
