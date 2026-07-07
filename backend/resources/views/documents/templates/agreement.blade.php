@extends('documents.layout')

@section('content')
    <h1>Agreement Letter</h1>

    <p>
        This Agreement Letter confirms the allocation arrangement between {{ $data['company_name'] }}
        and {{ $data['customer_name'] ?? 'the customer' }} for the property described below.
    </p>

    <div class="meta-grid">
        <div class="meta-row"><div class="meta-label">Customer Name</div><div class="meta-value">{{ $data['customer_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Customer Address</div><div class="meta-value">{{ $data['address'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Property</div><div class="meta-value">{{ $data['property_name'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Location</div><div class="meta-value">{{ $data['property_location'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Plot Number</div><div class="meta-value">{{ $data['plot_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Allocation Number</div><div class="meta-value">{{ $data['allocation_number'] }}</div></div>
        <div class="meta-row"><div class="meta-label">Allocation Date</div><div class="meta-value">{{ $data['allocation_date'] }}</div></div>
    </div>

    <div class="section">
        <h2>Payment Summary</h2>
        <div class="meta-grid">
            <div class="meta-row"><div class="meta-label">Total Paid</div><div class="meta-value">{{ $data['amount_paid'] }}</div></div>
            <div class="meta-row"><div class="meta-label">Outstanding Balance</div><div class="meta-value">{{ $data['balance'] }}</div></div>
            <div class="meta-row"><div class="meta-label">Payment Duration</div><div class="meta-value">{{ $data['payment_duration'] }}</div></div>
            <div class="meta-row"><div class="meta-label">Next Due Date</div><div class="meta-value">{{ $data['next_payment_due'] ?? 'Not applicable' }}</div></div>
        </div>
    </div>

    <p>
        Both parties acknowledge the details above as the current basis for this agreement at the
        time this document was generated.
    </p>

    <div class="signature-grid">
        <div class="signature">For {{ $data['company_name'] }}</div>
        <div class="signature-spacer"></div>
        <div class="signature">{{ $data['customer_name'] }}</div>
    </div>
@endsection
