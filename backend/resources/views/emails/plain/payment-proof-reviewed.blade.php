Hello {{ $submission->client?->full_name ?? 'Client' }},

Your {{ str_replace('_', ' ', $submission->payment_category) }} payment proof for {{ number_format((float) $submission->amount, 2) }} has been {{ $status }}.
@if ($status === 'rejected' && $submission->rejection_reason)

Reason: {{ $submission->rejection_reason }}
@endif

@if ($status === 'approved')
The payment has been recorded and is reflected in your balance and receipt history.
@else
You can view your payment submission history in the TerraOps client portal.
@endif
