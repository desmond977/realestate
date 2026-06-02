@extends('emails.layouts.base')

@section('title', 'Allocation Updated')

@section('content')
<h1 style="margin: 0 0 20px; font-size: 22px; line-height: 1.3; color: #111111;">Allocation Updated</h1>

@if($recipientType === 'client')
    <p style="margin: 0 0 16px;">Hello {{ $allocation->client->full_name ?? 'Valued Client' }},</p>
    <p style="margin: 0 0 20px;">Your property allocation has been updated.</p>
@else
    <p style="margin: 0 0 16px;">Hello Administrative Team,</p>
    <p style="margin: 0 0 20px;">A property allocation has been updated in TerraOps.</p>
@endif

<p style="margin: 0 0 8px; font-weight: bold;">Transaction Details:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Client: {{ $allocation->client->full_name ?? 'N/A' }}</li>
    <li>Property: {{ $allocation->property->title ?? 'N/A' }}</li>
    <li>Allocation Reference: {{ $allocation->reference ?? 'N/A' }}</li>
    <li>Realtor: {{ $allocation->realtor->full_name ?? 'N/A' }}</li>
    <li>Allocation Date: {{ $allocation->allocated_at?->format('M d, Y') ?? 'N/A' }}</li>
</ul>

<p style="margin: 0 0 8px; font-weight: bold;">Important Summary:</p>
<ul style="margin: 0 0 20px 20px; padding: 0;">
    <li>Previous Status: {{ ucfirst($previousStatus) }}</li>
    <li>Current Status: {{ ucfirst($allocation->status->value ?? $allocation->status) }}</li>
    <li>Previous Paid Amount: &#8358;{{ number_format($previousAmountPaid, 2) }}</li>
    <li>Current Amount Paid: &#8358;{{ number_format($allocation->amount_paid, 2) }}</li>
    <li>Outstanding Balance: &#8358;{{ number_format($allocation->balance, 2) }}</li>
</ul>

<p style="margin: 0;">If you have questions about this update, please contact {{ $companyName ?? 'TerraOps' }}.</p>
@endsection
