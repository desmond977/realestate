<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $data['document_title'] ?? 'Document' }}</title>
    <style>
        @page {
            size: A4;
            margin: 18mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            background: #f6f7f4;
            color: #1f2a24;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            line-height: 1.65;
        }

        .document-page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #ffffff;
            padding: 22mm 20mm;
        }

        .letterhead {
            display: table;
            width: 100%;
            padding-bottom: 18px;
            border-bottom: 2px solid #234832;
        }

        .company-mark,
        .company-info {
            display: table-cell;
            vertical-align: top;
        }

        .company-mark {
            width: 64px;
        }

        .mark {
            display: inline-block;
            width: 48px;
            height: 48px;
            border-radius: 8px;
            background: #234832;
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
            line-height: 48px;
            text-align: center;
        }

        .company-info {
            text-align: right;
        }

        h1,
        h2,
        h3,
        p {
            margin-top: 0;
        }

        h1 {
            margin: 26px 0 18px;
            color: #234832;
            font-size: 24px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        h2 {
            color: #234832;
            font-size: 16px;
            margin-bottom: 8px;
        }

        .meta-grid {
            display: table;
            width: 100%;
            margin: 18px 0 24px;
            border: 1px solid #d9dfd8;
            border-collapse: collapse;
        }

        .meta-row {
            display: table-row;
        }

        .meta-label,
        .meta-value {
            display: table-cell;
            padding: 9px 12px;
            border-bottom: 1px solid #d9dfd8;
            vertical-align: top;
        }

        .meta-label {
            width: 34%;
            background: #f6f7f4;
            color: #667267;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .meta-value {
            color: #1f2a24;
            font-weight: 600;
        }

        .section {
            margin-top: 22px;
        }

        .signature-grid {
            display: table;
            width: 100%;
            margin-top: 46px;
        }

        .signature {
            display: table-cell;
            width: 48%;
            padding-top: 36px;
            border-top: 1px solid #1f2a24;
            color: #667267;
            font-size: 12px;
        }

        .signature-spacer {
            display: table-cell;
            width: 4%;
        }

        .footer-note {
            margin-top: 36px;
            padding-top: 12px;
            border-top: 1px solid #d9dfd8;
            color: #667267;
            font-size: 12px;
        }

        @media print {
            body {
                background: #ffffff;
            }

            .document-page {
                width: auto;
                min-height: auto;
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <main class="document-page">
        <header class="letterhead">
            <div class="company-mark">
                <span class="mark">{{ strtoupper(substr($data['company_name'] ?? 'T', 0, 1)) }}</span>
            </div>
            <div class="company-info">
                <h2>{{ $data['company_name'] ?? 'Terra Ops' }}</h2>
                <p>
                    {{ $data['company_address'] ?? 'Company Address' }}<br>
                    {{ $data['company_phone'] ?? 'Company Phone' }} | {{ $data['company_email'] ?? 'Company Email' }}
                </p>
            </div>
        </header>

        @yield('content')

        <p class="footer-note">
            Generated on {{ $data['today_date'] ?? now()->format('M d, Y') }}
            @if(! empty($data['generated_by']))
                by {{ $data['generated_by'] }}
            @endif
            . This document was generated from the saved allocation record.
        </p>
    </main>
</body>
</html>
