<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class PreventDuplicateRequests
{
    private const TTL_SECONDS = 120;

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->getMethod(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $idempotencyKey = $request->header('Idempotency-Key');

        if (! $idempotencyKey) {
            return $next($request);
        }

        $cacheKey = $this->buildCacheKey($user, $idempotencyKey);

        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);

            if (isset($cached['response'])) {
                return response($cached['response']['content'], $cached['response']['status'])
                    ->withHeaders($cached['response']['headers'] ?? []);
            }

            if (isset($cached['locked_at']) && $cached['locked_at'] > now()->subSeconds(self::TTL_SECONDS)->timestamp) {
                return response(['message' => 'Duplicate request detected. Please wait and try again.'], 409);
            }
        }

        Cache::put($cacheKey, ['locked_at' => now()->timestamp], now()->addSeconds(self::TTL_SECONDS));

        try {
            $response = $next($request);

            Cache::put(
                $cacheKey,
                [
                    'response' => [
                        'content' => $response->getContent(),
                        'status' => $response->getStatusCode(),
                        'headers' => $response->headers->all(),
                    ],
                ],
                now()->addSeconds(self::TTL_SECONDS)
            );

            return $response;
        } finally {
            // Keep the lock briefly so racing identical requests still resolve
            // from the cache above instead of hitting the app twice.
        }
    }

    private function buildCacheKey($user, string $idempotencyKey): string
    {
        return 'idempotency:'.($user->id ?? 'guest').':'.sha1($idempotencyKey);
    }
}
