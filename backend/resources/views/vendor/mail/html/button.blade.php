@props(['url', 'color' => 'primary'])

<p style="margin: 24px 0;">
    <a href="{{ $url }}" style="display: inline-block; color: #111111; text-decoration: underline; font-weight: bold;">
        {{ $slot }}
    </a>
</p>
