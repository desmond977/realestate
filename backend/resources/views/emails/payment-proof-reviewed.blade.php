<p>Hello {{ $submission->client?->full_name ?? 'Client' }},</p>

<p>Your {{ str_replace('_', ' ', $submission->payment_category) }} payment proof for
{{ number_format((float) $submission->amount, 2) }} has been {{ $status }}.</p>

@if ($status === 'rejected' && $submission->rejection_reason)
    <p>Reason: {{ $submission->rejection_reason }}</p>
@endif

@if ($status === 'approved')
    <p>The payment has been recorded and is reflected in your balance and receipt history.</p>
@else
    <p>You can view your payment submission history in the TerraOps client portal.</p>
@endif
