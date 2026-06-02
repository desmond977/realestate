<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientDashboardResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'profile_image_url' => $this->profile_image_url,
            'role' => $this->role,
            'summary' => [
                'total_properties' => $this->allocations()->count(),
                'total_paid' => $this->totalPaid(),
                'outstanding_balance' => $this->outstandingBalance(),
                'payment_progress' => $this->paymentProgress(),
                'active_allocations' => $this->allocations()->where('status', 'active')->count(),
            ],
            'recent_payments' => PaymentResource::collection(
                $this->payments()
                    ->latest()
                    ->take(5)
                    ->get()
            ),
            'recent_receipts' => ReceiptResource::collection(
                $this->receipts()
                    ->latest()
                    ->take(5)
                    ->get()
            ),
            'primary_realtor' => $this->when(
                $this->primaryRealtor(),
                fn() => new RealtorResource($this->primaryRealtor())
            ),
            'has_outstanding_balance' => $this->hasOutstandingBalance(),
        ];
    }
}
