@extends('emails.layouts.base')

@section('title', 'Payment Reminder - Outstanding Balance')

@section('content')
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 22px; font-weight: 600;">
        Payment Reminder
    </h2>

    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        Dear {{ $allocation->client->full_name ?? 'Valued Client' }},
    </p>
    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        We hope this message finds you well. This is a friendly reminder regarding your outstanding balance for your property allocation.
    </p>

    <!-- Allocation Summary -->
    <h3 style="margin: 24px 0 16px; color: #111827; font-size: 18px; font-weight: 600;">Allocation Summary</h3>
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
            <td style="padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Detail</td>
            <td style="padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">Information</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Property</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $allocation->property->title ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Location</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $allocation->property->location ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Total Amount</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">₦{{ number_format($allocation->total_amount, 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Amount Paid</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #059669; font-size: 14px;">₦{{ number_format($allocation->amount_paid, 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Outstanding Balance</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-size: 18px; font-weight: 700;">₦{{ number_format($allocation->balance, 2) }}</td>
        </tr>
    </table>

    <!-- Outstanding Balance Alert -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #fef3c7; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
        <tr>
            <td style="padding: 16px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                    <strong>Outstanding Balance: ₦{{ number_format($allocation->balance, 2) }}</strong>
                </p>
                <p style="margin: 8px 0 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                    Please arrange to settle this amount at your earliest convenience to avoid any inconvenience.
                </p>
            </td>
        </tr>
    </table>

    <!-- Payment Instructions -->
    <h3 style="margin: 24px 0 16px; color: #111827; font-size: 18px; font-weight: 600;">How to Make a Payment</h3>
    <p style="margin: 0 0 12px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        You can make your payment through the following methods:
    </p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #4b5563; font-size: 16px; line-height: 1.8;">
        <li>Bank transfer to our designated account</li>
        <li>Cheque payment at our office</li>
        <li>Online payment through our portal</li>
    </ul>

    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        If you have already made this payment, please disregard this reminder and accept our thanks. If you have any questions or need assistance with your payment, please don't hesitate to contact us.
    </p>

    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Thank you for your continued partnership.
    </p>
    <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Best regards,<br>
        <strong>{{ $companyName ?? 'TerraOps' }} Team</strong>
    </p>
@endsection
