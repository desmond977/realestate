<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Http\Request;

class TenantManager
{
    private ?Tenant $tenant = null;
    private ?int $tenantId = null;

    public function set(Tenant $tenant): void
    {
        $this->tenant = $tenant;
        $this->tenantId = $tenant->id;
    }

    public function setId(?int $tenantId): void
    {
        $this->tenant = null;
        $this->tenantId = $tenantId;
    }

    public function current(): ?Tenant
    {
        return $this->tenant;
    }

    public function currentId(): ?int
    {
        return $this->tenantId ?? $this->tenant?->id;
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
