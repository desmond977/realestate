<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $role = $request->user()?->role?->value ?? $request->user()?->role;

        if (! $role || ! in_array($role, $roles, true)) {
            abort(403, 'This action is not authorized for your role.');
        }

        return $next($request);
    }
}
