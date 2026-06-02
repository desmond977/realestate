@extends('emails.layouts.base')

@section('title', 'Outstanding Balance Reminder')

@section('content')
<h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; color: #111111;">Outstanding Balance Reminder</h1>

<p style="margin: 0 0 16px;">Hello {{ $allocation->client->full_name ?? 'Valued Client' }},</p>

<p style="margin: 0 0 20px;">This is a reminder that you have an outstanding balance on your property allocation.</p>

<p style="margin: 0 0 8px; font-weight: bold;">Transaction Details:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Property: {{ $allocation->property->title ?? 'N/A' }}</li>
    <li>Allocation Reference: {{ $allocation->reference ?? 'N/A' }}</li>
    <li>Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}</li>
</ul>

<p style="margin: 0 0 8px; font-weight: bold;">Important Summary:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Property Price: &#8358;{{ number_format($allocation->total_amount, 2) }}</li>
    <li>Amount Paid: &#8358;{{ number_format($allocation->amount_paid, 2) }}</li>
    <li>Outstanding Balance: &#8358;{{ number_format($allocation->balance, 2) }}</li>
</ul>

<p style="margin: 0;">Please complete your payment to keep your allocation in good standing.</p>
@endsection
