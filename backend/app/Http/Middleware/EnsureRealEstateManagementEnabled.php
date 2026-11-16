<?php

namespace App\Http\Middleware;

use App\Models\CompanySetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRealEstateManagementEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        $enabled = CompanySetting::query()->value('real_estate_management_enabled');

        abort_unless($enabled === null || (bool) $enabled, 403, 'Real Estate Management is disabled.');

        return $next($request);
    }
}
