@extends('emails.layouts.base')

@section('title', 'Payment Due Reminder')

@section('content')
@php
    $urgencyLabel = match($daysUntilDue) {
        21 => 'Coming Up',
        7 => 'Coming Up Soon',
        3 => 'Almost Due',
        0 => 'Due Today',
        default => 'Reminder',
    };

    $urgencyColor = match($daysUntilDue) {
        21 => '#2563eb',
        7 => '#d97706',
        3 => '#dc2626',
        0 => '#dc2626',
        default => '#6b7280',
    };
@endphp

<h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; color: #111111;">Payment Reminder</h1>

<p style="margin: 0 0 16px;">Hello {{ $allocation->client->full_name ?? 'Valued Client' }},</p>

<p style="margin: 0 0 20px;">
    This is a friendly reminder that your payment for
    <strong>{{ $allocation->property->title ?? 'your property allocation' }}</strong>
    is
    @if($daysUntilDue > 0)
        due in <strong>{{ $daysUntilDue }} day(s)</strong>
    @else
        <strong>due today</strong>
    @endif
    .
</p>

<p style="margin: 0 0 8px; font-weight: bold; color: {{ $urgencyColor }};">Status: {{ $urgencyLabel }}</p>

<p style="margin: 0 0 20px;">Please ensure payment is completed by the due date to keep your allocation in good standing.</p>

<p style="margin: 0 0 8px; font-weight: bold;">Transaction Details:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Property: {{ $allocation->property->title ?? 'N/A' }}</li>
    <li>Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}</li>
    <li>Payment Duration: {{ $allocation->paymentDurationLabel() }}</li>
    <li>Due Date: {{ $dueDate->format('F j, Y') }}</li>
</ul>

<p style="margin: 0 0 8px; font-weight: bold;">Payment Summary:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Original Property Price: &#8358;{{ number_format($allocation->original_price ?? $allocation->total_amount, 2) }}</li>
    @if((float) ($allocation->discount_amount ?? 0) > 0)
        <li>Promotional Discount: &#8358;{{ number_format($allocation->discount_amount, 2) }}{{ $allocation->discount_type === 'percentage' ? ' (' . number_format((float) $allocation->discount_value, 2) . '%)' : '' }}</li>
    @endif
    <li>Final Payable Amount: &#8358;{{ number_format($allocation->total_amount, 2) }}</li>
    <li>Amount Paid: &#8358;{{ number_format($allocation->amount_paid, 2) }}</li>
    <li>Outstanding Balance: &#8358;{{ number_format($allocation->balance, 2) }}</li>
</ul>

<p style="margin: 0;">If you have already made this payment, please disregard this reminder. Contact us if you have any questions.</p>

@endsection
