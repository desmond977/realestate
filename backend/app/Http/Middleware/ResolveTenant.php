<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;

class ResolveTenant
{
    public function __construct(private readonly TenantManager $tenantManager)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        $tenant = $this->tenantManager->resolveFromRequest($request) ?? Tenant::getDefault();

        if ($tenant) {
            $this->tenantManager->set($tenant);
        }

        return $next($request);
    }
}
