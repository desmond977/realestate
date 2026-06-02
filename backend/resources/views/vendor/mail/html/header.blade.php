<p style="margin: 0 0 24px; font-size: 18px; font-weight: bold; color: #111111;">
    @if(trim($url) !== '')
        <a href="{{ $url }}" style="color: #111111; text-decoration: none;">{{ $slot }}</a>
    @else
        {{ $slot }}
    @endif
</p>
