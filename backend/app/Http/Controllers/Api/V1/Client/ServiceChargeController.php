<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Enums\ServiceChargePaymentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceChargeResource;
use App\Models\ServiceCharge;
use App\Services\TenantManager;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceChargeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => ['sometimes', 'date_format:Y-m'],
        ]);
        $month = $validated['month'] ?? now()->format('Y-m');
        if ($month === now()->format('Y-m')) {
            $tenantId = app(TenantManager::class)->currentId() ?? 'default';
            $cacheKey = 'service_charges_generated:'.$tenantId.':'.$month.':'.now()->toDateString();
            Cache::remember($cacheKey, now()->addMinutes(10), function () use ($month) {
                Artisan::call('service-charges:generate-monthly', ['--month' => $month]);

                return true;
            });
        }
        $monthStart = $month.'-01';
        $monthEnd = date('Y-m-t', strtotime($monthStart));
        $charges = ServiceCharge::query()
            ->where('client_id', $request->user()->id)
            ->where(function ($query) use ($month, $monthStart, $monthEnd) {
                $query->where('billing_month', $month)
                    ->orWhere(function ($query) use ($monthStart, $monthEnd) {
                        $query->whereNull('billing_month')
                            ->whereDate('billing_period_start', '>=', $monthStart)
                            ->whereDate('billing_period_start', '<=', $monthEnd);
                    });
            })
            ->with([
                'category',
                'rentalAgreement',
                'rentalProperty.property',
                'client',
                'payments' => fn ($query) => $query
                    ->where('status', ServiceChargePaymentStatus::Confirmed->value)
                    ->with(['recorder', 'approver', 'receipt'])
                    ->orderByDesc('paid_at'),
            ])
            ->withSum([
                'payments as amount_paid' => fn ($query) => $query
                    ->where('status', ServiceChargePaymentStatus::Confirmed->value),
            ], 'amount')
            ->orderBy('category_id')
            ->get();

        $charges->each(function (ServiceCharge $charge): void {
            $charge->setAttribute('amount_paid', (float) ($charge->amount_paid ?? 0));
        });

        return response()->json([
            'data' => [
                'month' => $month,
                'charges' => ServiceChargeResource::collection($charges),
                'collections' => (float) $charges->sum(fn (ServiceCharge $charge) => $charge->amount_paid),
                'outstanding' => (float) $charges->sum(fn (ServiceCharge $charge) => max(0, (float) $charge->amount_due - (float) $charge->amount_paid)),
            ],
        ]);
    }
}
