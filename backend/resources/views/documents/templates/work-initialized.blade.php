@extends('documents.layout')

@section('content')
    <h1>Work Initialized Letter</h1>

    <p>
        This letter confirms that work initialization has been recorded for the allocation below.
    </p>

    <div class="meta-grid">
        <div class="meta-row"><div class="meta-label">Customer</div><div class="meta-value">{{ $data['customer_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Property</div><div class="meta-value">{{ $data['property_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Location</div><div class="meta-value">{{ $data['property_location'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Plot Number</div><div class="meta-value">{{ $data['plot_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Allocation Number</div><div class="meta-value">{{ $data['allocation_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Payment Duration</div><div class="meta-value">{{ $data['payment_duration'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Balance</div><div class="meta-value">{{ $data['balance'] }}</div></div>
    </div>

    <p>
        The customer should retain this document as a formal record that the work initialization
        stage has been generated for the allocation listed above.
    </p>

    <div class="signature-grid">
        <div class="signature">Operations Representative</div>
        <div class="signature-spacer"></div>
        <div class="signature">Customer Acknowledgement</div>
    </div>
@endsection
