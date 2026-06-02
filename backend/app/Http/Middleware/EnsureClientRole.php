<?php

namespace App\Http\Middleware;

use App\Models\Client;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureClientRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user()) {
            return response()->json([
                'message' => 'Unauthenticated.',
                'redirect' => '/login'
            ], 401);
        }

        if (!$request->user() instanceof Client) {
            return response()->json([
                'message' => 'Access forbidden. Client portal access required.',
                'redirect' => '/login'
            ], 403);
        }

        return $next($request);
    }
}
