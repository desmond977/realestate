@extends('emails.layouts.base')

@section('title', $recipientType === 'admin' ? 'New Allocation Created' : 'Allocation Created')

@section('content')
<h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; color: #111111;">
    {{ $recipientType === 'admin' ? 'New Allocation Created' : 'Allocation Created' }}
</h1>

@if($recipientType === 'client')
    <p style="margin: 0 0 16px;">Hello {{ $allocation->client->full_name ?? 'Valued Client' }},</p>
    <p style="margin: 0 0 20px;">Your property allocation has been successfully created.</p>
@else
    <p style="margin: 0 0 16px;">Hello Administrative Team,</p>
    <p style="margin: 0 0 20px;">A new property allocation has been created in TerraOps.</p>
@endif

<p style="margin: 0 0 8px; font-weight: bold;">Transaction Details:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Client: {{ $allocation->client->full_name ?? 'N/A' }}</li>
    <li>Property: {{ $allocation->property->title ?? 'N/A' }}</li>
    <li>Location: {{ $allocation->property->location ?? 'N/A' }}</li>
    <li>Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}</li>
    <li>Payment Plan: {{ ucfirst($allocation->payment_plan->value ?? 'installment') }}</li>
    <li>Payment Duration: {{ $allocation->paymentDurationLabel() }}</li>
    <li>Payment Status: {{ ucfirst($allocation->status->value ?? 'active') }}</li>
    <li>Allocation Date: {{ $allocation->allocated_at ? $allocation->allocated_at->format('M d, Y') : 'N/A' }}</li>
</ul>

<p style="margin: 0 0 8px; font-weight: bold;">Important Summary:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Property Price: &#8358;{{ number_format($allocation->total_amount, 2) }}</li>
    <li>Amount Paid: &#8358;{{ number_format($allocation->amount_paid, 2) }}</li>
    <li>Outstanding Balance: &#8358;{{ number_format($allocation->balance, 2) }}</li>
</ul>

@if($recipientType === 'client')
    <p style="margin: 0;">Thank you for choosing {{ $companyName ?? 'TerraOps' }}.</p>
@else
    <p style="margin: 0;">Please review the allocation details in the admin portal if follow-up is required.</p>
@endif
@endsection
