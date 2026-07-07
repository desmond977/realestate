@extends('emails.layouts.base')

@section('title', $recipientType === 'admin' ? 'Payment Created' : 'Payment Received')

@section('content')
<h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; color: #111111;">
    {{ $recipientType === 'admin' ? 'Payment Created' : 'Payment Received' }}
</h1>

@if($recipientType === 'client')
    <p style="margin: 0 0 16px;">Hello {{ $payment->client->full_name ?? 'Valued Client' }},</p>
    <p style="margin: 0 0 20px;">Your payment has been successfully received.</p>
@else
    <p style="margin: 0 0 16px;">Hello Administrative Team,</p>
    <p style="margin: 0 0 20px;">A payment has been recorded in TerraOps.</p>
@endif

<p style="margin: 0 0 8px; font-weight: bold;">Transaction Details:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Client: {{ $payment->client->full_name ?? 'N/A' }}</li>
    <li>Property: {{ $payment->property->title ?? 'N/A' }}</li>
    <li>Realtor: {{ $payment->realtor->full_name ?? 'N/A' }}</li>
    <li>Payment Date: {{ $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : 'N/A' }}</li>
    <li>Payment Method: {{ $payment->payment_method ?? 'N/A' }}</li>
    @if($payment->receipt)
        <li>Receipt Number: {{ $payment->receipt->receipt_number ?? 'N/A' }}</li>
    @endif
</ul>

<p style="margin: 0 0 8px; font-weight: bold;">Important Summary:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Payment Amount: &#8358;{{ number_format($payment->amount, 2) }}</li>
    <li>Total Paid So Far: &#8358;{{ number_format($payment->allocation->amount_paid ?? 0, 2) }}</li>
    <li>Outstanding Balance: &#8358;{{ number_format($payment->allocation->balance ?? 0, 2) }}</li>
</ul>

@if(($payment->allocation->balance ?? 0) <= 0)
    <p style="margin: 0 0 16px; font-weight: bold;">This property is now fully paid.</p>
@endif

<p style="margin: 0;">Thank you for your payment.</p>
@endsection
