<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>@yield('title', ($companyName ?? 'TerraOps') . ' Notification')</title>
</head>
<body style="margin: 0; padding: 0; background: #ffffff; color: #111111; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
    <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
        <p style="margin: 0 0 24px; font-size: 18px; font-weight: bold; color: #111111;">
            {{ $companyName ?? 'TerraOps' }}
        </p>

        @yield('content')

        <p style="margin: 32px 0 0; color: #111111;">
            Regards,<br>
            {{ $companyName ?? 'TerraOps' }} Team
        </p>

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #dddddd; color: #555555; font-size: 13px;">
            <p style="margin: 0;">&copy; {{ date('Y') }} {{ $companyName ?? 'TerraOps' }}. All rights reserved.</p>
            @if($companyAddress ?? false)
                <p style="margin: 8px 0 0;">{{ $companyAddress }}</p>
            @endif
            @if(($companyEmail ?? false) || ($companyPhone ?? false))
                <p style="margin: 8px 0 0;">
                    @if($companyEmail ?? false)
                        {{ $companyEmail }}
                    @endif
                    @if(($companyEmail ?? false) && ($companyPhone ?? false))
                        |
                    @endif
                    @if($companyPhone ?? false)
                        {{ $companyPhone }}
                    @endif
                </p>
            @endif
        </div>
    </div>
</body>
</html>
