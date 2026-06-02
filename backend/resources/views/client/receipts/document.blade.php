<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $receipt->receipt_number }}</title>
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
                <p class="muted">{{ $company?->company_name ?? 'Company' }} Client Portal</p>
            </div>
            <div>
                <strong>{{ $receipt->receipt_number }}</strong><br>
                <span class="muted">{{ $receipt->issued_at?->format('M d, Y') }}</span>
            </div>
        </div>

        <div class="grid">
            <div class="item">
                <span class="label">Client</span>
                <span class="value">{{ $receipt->payment?->client?->full_name ?? 'Client' }}</span>
            </div>
            <div class="item">
                <span class="label">Property</span>
                <span class="value">{{ $receipt->payment?->property?->title ?? $receipt->payment?->allocation?->property?->title ?? 'Property' }}</span>
            </div>
            <div class="item">
                <span class="label">Payment Method</span>
                <span class="value">{{ $receipt->payment?->payment_method ?? 'N/A' }}</span>
            </div>
            <div class="item">
                <span class="label">Transaction Reference</span>
                <span class="value">{{ $receipt->payment?->transaction_reference ?? 'N/A' }}</span>
            </div>
            <div class="item">
                <span class="label">Payment Date</span>
                <span class="value">{{ $receipt->payment?->paid_at?->format('M d, Y') ?? 'N/A' }}</span>
            </div>
            <div class="item">
                <span class="label">Amount Paid</span>
                <span class="value amount">{{ number_format((float) ($receipt->payment?->amount ?? 0), 2) }}</span>
            </div>
        </div>
    </main>
</body>
</html>
