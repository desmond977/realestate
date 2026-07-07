@extends('documents.layout')

@section('content')
    <h1>Offer Letter</h1>

    <p>{{ $data['today_date'] }}</p>

    <p>
        Dear {{ $data['customer_name'] ?? 'Customer' }},
    </p>

    <p>
        We are pleased to offer you the property allocation detailed below. This offer is prepared
        based on the customer and allocation information currently recorded by {{ $data['company_name'] }}.
    </p>

    <div class="meta-grid">
        <div class="meta-row"><div class="meta-label">Customer</div><div class="meta-value">{{ $data['customer_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Phone</div><div class="meta-value">{{ $data['phone'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Email</div><div class="meta-value">{{ $data['email'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Property</div><div class="meta-value">{{ $data['property_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Plot Number</div><div class="meta-value">{{ $data['plot_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Allocation Number</div><div class="meta-value">{{ $data['allocation_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Payment Duration</div><div class="meta-value">{{ $data['payment_duration'] }}</div></div>
    </div>

    <p>
        Kindly review this offer and keep a copy for your records. The offer remains subject to the
        payment and allocation terms maintained by {{ $data['company_name'] }}.
    </p>

    <div class="signature-grid">
        <div class="signature">Authorized Signatory</div>
        <div class="signature-spacer"></div>
        <div class="signature">Customer Signature</div>
    </div>
@endsection
