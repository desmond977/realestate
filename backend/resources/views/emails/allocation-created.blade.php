@extends('emails.layouts.base')

@section('title', $recipientType === 'admin' ? 'New Allocation Created' : 'Allocation Confirmation')

@section('content')
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 22px; font-weight: 600;">
        @if($recipientType === 'admin')
            New Allocation Created
        @else
            Allocation Confirmed
        @endif
    </h2>

    @if($recipientType === 'client')
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            Dear {{ $allocation->client->full_name ?? 'Valued Client' }},
        </p>
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            We are pleased to confirm that your property allocation has been successfully processed. Below are the details of your allocation:
        </p>
    @else
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            A new allocation has been created in the system. Here are the details:
        </p>
    @endif

    <!-- Allocation Details Table -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0;">
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
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Client</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $allocation->client->full_name ?? 'N/A' }}</td>
        </tr>
        @if($allocation->realtor)
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Realtor</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $allocation->realtor->full_name ?? 'N/A' }}</td>
        </tr>
        @endif
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Total Amount</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">₦{{ number_format($allocation->total_amount, 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Amount Paid</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">₦{{ number_format($allocation->amount_paid, 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Outstanding Balance</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-size: 14px; font-weight: 600;">₦{{ number_format($allocation->balance, 2) }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Payment Plan</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ ucfirst($allocation->payment_plan->value ?? 'installment') }}</td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Status</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
                @php
                    $statusColors = [
                        'reserved' => '#f59e0b',
                        'active' => '#10b981',
                        'completed' => '#6b7280',
                        'cancelled' => '#ef4444',
                    ];
                    $statusColor = $statusColors[$allocation->status->value ?? 'active'] ?? '#6b7280';
                @endphp
                <span style="display: inline-block; padding: 4px 12px; background-color: {{ $statusColor }}; color: #ffffff; border-radius: 4px; font-size: 12px; font-weight: 600;">{{ ucfirst($allocation->status->value ?? 'active') }}</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #374151; font-size: 14px;">Allocation Date</td>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">{{ $allocation->allocated_at ? $allocation->allocated_at->format('M d, Y') : 'N/A' }}</td>
        </tr>
    </table>

    @if($allocation->amount_paid > 0)
        <!-- Success Banner for Payment -->
        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #d1fae5; border-radius: 8px; padding: 16px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
                        ✓ Receipt has been generated for this payment.
                    </p>
                </td>
            </tr>
        </table>
    @else
        <!-- Warning Banner for Unpaid -->
        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #fef3c7; border-radius: 8px; padding: 16px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">
                        ⚠ Reservation is pending payment. Please complete your payment to secure your property.
                    </p>
                </td>
            </tr>
        </table>
    @endif

    @if($recipientType === 'client')
        <p style="margin: 20px 0 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for choosing TerraOps. If you have any questions about your allocation, please don't hesitate to contact us.
        </p>
    @endif

    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Best regards,<br>
        <strong>{{ $companyName ?? 'TerraOps' }} Team</strong>
    </p>
@endsection
