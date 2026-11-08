<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;

class ResolveTenant
{
    public function __construct(private readonly TenantManager $tenantManager) {}

    public function handle(Request $request, Closure $next)
    {
        // This manager is a singleton, so reset it before Sanctum resolves a token user.
        $this->tenantManager->setId(null);
        $requestedTenant = $this->tenantManager->resolveFromRequest($request);
        $authenticatedUser = $request->user('sanctum');

        if ($authenticatedUser) {
            $authenticatedTenantId = (int) ($authenticatedUser->tenant_id ?: 1);

            abort_if(
                $requestedTenant && (int) $requestedTenant->id !== $authenticatedTenantId,
                403,
                'The requested organization does not match your account.'
            );

            $this->tenantManager->setId($authenticatedTenantId);
        } else {
            $identifier = $request->header('X-Tenant-ID') ?? $request->input('tenant_id');
            abort_if($identifier && ! $requestedTenant, 404, 'Organization not found.');

            $tenant = $requestedTenant ?? Tenant::getDefault();
            $this->tenantManager->setId($tenant?->id ?? 1);
        }

        return $next($request);
    }
}
