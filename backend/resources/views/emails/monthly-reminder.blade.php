@extends('emails.layouts.base')

@section('title', 'Monthly Update - ' . $month)

@section('content')
    <h2 style="margin: 0 0 20px; color: #111827; font-size: 22px; font-weight: 600;">
        Hello {{ $client->full_name ?? 'Valued Client' }}!
    </h2>

    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        We hope this message finds you well. As we enter {{ $month }}, we wanted to take a moment to reach out and share some updates with you.
    </p>

    <!-- Appreciation Message -->
    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #eff6ff; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb;">
        <tr>
            <td style="padding: 20px;">
                <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.7;">
                    <strong>Thank you for being a valued client of {{ $companyName ?? 'TerraOps' }}.</strong>
                </p>
                <p style="margin: 12px 0 0; color: #1e40af; font-size: 15px; line-height: 1.7;">
                    Your trust in us means everything, and we're committed to continuing to provide you with exceptional service and investment opportunities.
                </p>
            </td>
        </tr>
    </table>

    <!-- Project Updates Section -->
    <h3 style="margin: 28px 0 16px; color: #111827; font-size: 18px; font-weight: 600;">
        📈 What's Happening at {{ $companyName ?? 'TerraOps' }}
    </h3>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        We're constantly working to expand our property portfolio and improve our services. Here are some highlights:
    </p>
    <ul style="margin: 0 0 20px; padding-left: 20px; color: #4b5563; font-size: 16px; line-height: 1.8;">
        <li>New property developments in prime locations</li>
        <li>Enhanced digital payment systems for your convenience</li>
        <li>Improved customer support and response times</li>
        <li>Exclusive investment opportunities for existing clients</li>
    </ul>

    <!-- Investment Encouragement -->
    <h3 style="margin: 28px 0 16px; color: #111827; font-size: 18px; font-weight: 600;">
        💰 Investment Opportunity
    </h3>
    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        The real estate market continues to show strong growth potential. If you're considering expanding your property portfolio, now is an excellent time to explore our latest offerings. Our team is ready to help you find the perfect investment property that matches your goals.
    </p>

    @if($outstandingBalance !== null && $outstandingBalance > 0)
        <!-- Outstanding Balance Section -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

        <h3 style="margin: 28px 0 16px; color: #111827; font-size: 18px; font-weight: 600;">
            💳 Payment Reminder
        </h3>
        <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            We noticed that you have an outstanding balance on your property allocation. We wanted to gently remind you to complete your payment to secure your investment.
        </p>

        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 16px 0; background-color: #fef3c7; border-radius: 8px; padding: 16px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                        <strong>Outstanding Balance:</strong> ₦{{ number_format($outstandingBalance, 2) }}
                    </p>
                </td>
            </tr>
        </table>

        <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
            If you have any questions about your payment or need to discuss payment arrangements, please don't hesitate to reach out to us. We're here to help.
        </p>
    @else
        <!-- All Paid Up Message -->
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

        <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #d1fae5; border-radius: 8px; padding: 16px;">
            <tr>
                <td style="padding: 16px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px; font-weight: 600;">
                        ✓ Your account is in good standing. Thank you for staying current with your payments!
                    </p>
                </td>
            </tr>
        </table>
    @endif

    <!-- Contact Information -->
    <h3 style="margin: 28px 0 16px; color: #111827; font-size: 18px; font-weight: 600;">
        📞 Get in Touch
    </h3>
    <p style="margin: 0 0 16px; color: #4b5563; font-size: 16px; line-height: 1.6;">
        Our team is always available to assist you with any questions or concerns. Feel free to reach out:
    </p>
    <p style="margin: 0; color: #4b5563; font-size: 16px; line-height: 1.8;">
        @if($companyPhone ?? false)
            📱 Phone: {{ $companyPhone }}<br>
        @endif
        @if($companyEmail ?? false)
            📧 Email: {{ $companyEmail }}<br>
        @endif
        @if($companyAddress ?? false)
            📍 Address: {{ $companyAddress }}
        @endif
    </p>

    <p style="margin: 28px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Thank you again for choosing {{ $companyName ?? 'TerraOps' }}. We look forward to continuing to serve you.
    </p>
    <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Warm regards,<br>
        <strong>The {{ $companyName ?? 'TerraOps' }} Team</strong>
    </p>
@endsection
