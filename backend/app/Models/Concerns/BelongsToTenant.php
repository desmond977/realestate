<?php

namespace App\Models\Concerns;

use App\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            $tenantId = app(TenantManager::class)->currentId();

            if ($tenantId !== null) {
                $query->where('tenant_id', $tenantId);
            }
        });

        static::creating(function (Model $model) {
            if ($model->tenant_id === null) {
                $tenantId = app(TenantManager::class)->currentId();

                if ($tenantId !== null) {
                    $model->tenant_id = $tenantId;
                }
            }
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Tenant::class);
    }
}
