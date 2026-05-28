@extends('emails.layouts.base')

@section('title', $recipientType === 'admin' ? 'Payment Received' : 'Payment Confirmation')

@section('content')
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 22px; font-weight: 600;">
        @if($recipientType === 'admin')
            Payment Received
        @else
            Payment Confirmed
        @endif
    </h2>

    @if($recipientType === 'client')
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            Dear {{ $payment->client->full_name ?? 'Valued Client' }},
        </p>
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            We are pleased to confirm that your payment has been successfully received and processed. Here are the details:
        </p>
    @else
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            A payment has been recorded in the system. Here are the details:
        </p>
    @endif

    <!-- Payment Details Table -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
            <td style="padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Detail</td>
            <td style="padding: 12px 16px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">Information</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Payment Amount</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #059669; font-size: 18px; font-weight: 700;">₦{{ number_format($payment->amount, 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Property</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $payment->property->title ?? 'N/A' }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Client</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $payment->client->full_name ?? 'N/A' }}</td>
        </tr>
        @if($payment->realtor)
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Realtor</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $payment->realtor->full_name ?? 'N/A' }}</td>
        </tr>
        @endif
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Payment Date</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $payment->paid_at ? $payment->paid_at->format('M d, Y h:i A') : 'N/A' }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Payment Method</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $payment->payment_method ?? 'N/A' }}</td>
        </tr>
        @if($payment->transaction_reference)
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Reference</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $payment->transaction_reference }}</td>
        </tr>
        @endif
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Total Paid So Far</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">₦{{ number_format($payment->allocation->amount_paid ?? 0, 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Remaining Balance</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-size: 14px; font-weight: 600;">₦{{ number_format($payment->allocation->balance ?? 0, 2) }}</td>
        </tr>
        @if($payment->receipt)
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Receipt Number</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $payment->receipt->receipt_number ?? 'N/A' }}</td>
        </tr>
        @endif
    </table>

    <!-- Success Banner -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #d1fae5; border-radius: 8px; padding: 16px;">
        <tr>
            <td style="padding: 16px;">
                <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
                    ✓ Payment successfully recorded. A receipt has been generated.
                </p>
            </td>
        </tr>
    </table>

    @if($payment->allocation->balance <= 0)
        <!-- Completed Banner -->
        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #dbeafe; border-radius: 8px; padding: 16px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                        🎉 Congratulations! This property is now fully paid.
                    </p>
                </td>
            </tr>
        </table>
    @endif

    @if($recipientType === 'client')
        <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for your payment. If you have any questions, please don't hesitate to contact us.
        </p>
    @endif

    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Best regards,<br>
        <strong>{{ $companyName ?? 'TerraOps' }} Team</strong>
    </p>
@endsection
