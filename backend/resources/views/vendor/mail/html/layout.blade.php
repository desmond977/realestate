<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>{{ config('app.name') }}</title>
</head>
<body style="margin: 0; padding: 0; background: #ffffff; color: #111111; font-family: Arial, Helvetica, sans-serif; line-height: 1.6;">
    <div style="max-width: 640px; margin: 0 auto; padding: 24px 16px;">
        {{ $header ?? '' }}

        <div style="color: #111111; font-size: 15px;">
            {{ Illuminate\Mail\Markdown::parse($slot) }}
        </div>

        {{ $subcopy ?? '' }}

        {{ $footer ?? '' }}
    </div>
</body>
</html>
