<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Http\Request;

class TenantManager
{
    private ?Tenant $tenant = null;

    public function set(Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function current(): ?Tenant
    {
        return $this->tenant;
    }

    public function currentId(): ?int
    {
        return $this->tenant?->id;
    }

    public function resolveFromRequest(Request $request): ?Tenant
    {
        $identifier = $request->header('X-Tenant-ID') ?? $request->input('tenant_id');

        if (empty($identifier)) {
            return null;
        }

        return Tenant::query()
            ->where('is_active', true)
            ->where(fn ($query) => $query
                ->where('slug', $identifier)
                ->orWhere('id', $identifier)
                ->orWhere('domain', $identifier))
            ->first();
    }
}
