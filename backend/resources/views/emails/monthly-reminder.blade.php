@extends('emails.layouts.base')

@section('title', 'Happy New Month from TerraOps')

@section('content')
<h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; color: #111111;">Happy New Month from TerraOps</h1>

<p style="margin: 0 0 16px;">Hello {{ $client->full_name ?? 'Valued Client' }},</p>

<p style="margin: 0 0 16px;">Thank you for being a valued client of {{ $companyName ?? 'TerraOps' }}.</p>

<p style="margin: 0 0 20px;">We appreciate your trust in us and remain committed to keeping your property records and payment updates clear and accurate.</p>

@if($outstandingBalance !== null && $outstandingBalance > 0)
    <p style="margin: 0 0 8px; font-weight: bold;">Outstanding Balance:</p>
    <ul style="margin: 0 0 20px 20px; padding: 0;">
        @forelse($outstandingAllocations as $allocation)
            <li>
                Property: {{ data_get($allocation, 'property.title', 'N/A') }}<br>
                Payment Duration: {{ is_object($allocation) && method_exists($allocation, 'paymentDurationLabel') ? $allocation->paymentDurationLabel() : data_get($allocation, 'payment_duration_label', 'One-time Payment') }}<br>
                Amount Paid: &#8358;{{ number_format(data_get($allocation, 'amount_paid', 0), 2) }}<br>
                Remaining Balance: &#8358;{{ number_format(data_get($allocation, 'balance', 0), 2) }}
            </li>
        @empty
            <li>Total Outstanding Balance: &#8358;{{ number_format($outstandingBalance, 2) }}</li>
        @endforelse
    </ul>

    <p style="margin: 0;">Please complete your outstanding payment when due. For questions, contact {{ $companyEmail ?? $companyName ?? 'TerraOps' }}.</p>
@else
    <p style="margin: 0 0 20px; font-weight: bold;">Your account is currently up to date.</p>
    <p style="margin: 0;">Thank you for staying current with your payments.</p>
@endif
@endsection
