<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $documentData['receipt']['number'] ?? $receipt->receipt_number }}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #17211b; margin: 40px; }
        .receipt { max-width: 760px; margin: 0 auto; border: 1px solid #dfe6df; padding: 32px; }
        .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #dfe6df; padding-bottom: 20px; }
        h1 { margin: 0; font-size: 28px; }
        .muted { color: #647067; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 28px; }
        .item { border: 1px solid #dfe6df; padding: 14px; }
        .label { display: block; color: #647067; font-size: 12px; text-transform: uppercase; }
        .value { display: block; margin-top: 6px; font-size: 16px; font-weight: 700; }
        .amount { font-size: 32px; color: #166534; }
        @media print { body { margin: 0; } .receipt { border: 0; } }
    </style>
</head>
<body>
    <main class="receipt">
        <div class="header">
            <div>
                <h1>Payment Receipt</h1>
                <p class="muted">{{ $documentData['company']['name'] ?? $company?->company_name ?? 'Company' }} Client Portal</p>
            </div>
            <div>
                <strong>{{ $documentData['receipt']['number'] ?? $receipt->receipt_number }}</strong><br>
                <span class="muted">{{ $receipt->issued_at?->format('M d, Y') }}</span>
            </div>
        </div>

        <div class="grid">
            <div class="item">
                <span class="label">Client</span>
                <span class="value">{{ $documentData['client']['full_name'] ?? 'Client' }}</span>
            </div>
            <div class="item">
                <span class="label">Property</span>
                <span class="value">{{ $documentData['property']['title'] ?? 'Property' }}</span>
            </div>
            <div class="item">
                <span class="label">Payment Method</span>
                <span class="value">{{ $documentData['payment']['method'] ?? 'N/A' }}</span>
            </div>
            <div class="item">
                <span class="label">Transaction Reference</span>
                <span class="value">{{ $documentData['payment']['reference'] ?? 'N/A' }}</span>
            </div>
            <div class="item">
                <span class="label">Payment Date</span>
                <span class="value">
                    @if (! empty($documentData['payment']['paid_at']))
                        {{ \Illuminate\Support\Carbon::parse($documentData['payment']['paid_at'])->format('M d, Y') }}
                    @else
                        N/A
                    @endif
                </span>
            </div>
            <div class="item">
                <span class="label">Payment Duration</span>
                <span class="value">{{ $documentData['allocation']['payment_duration_label'] ?? 'One-time Payment' }}</span>
            </div>
            <div class="item">
                <span class="label">Amount Paid</span>
                <span class="value amount">{{ number_format((float) ($documentData['payment']['amount'] ?? 0), 2) }}</span>
            </div>
        </div>
    </main>
</body>
</html>
