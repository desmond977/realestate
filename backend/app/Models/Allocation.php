<?php

namespace App\Models;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Allocation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'property_id',
        'client_id',
        'realtor_id',
        'allocated_by',
        'total_amount',
        'amount_paid',
        'balance',
        'payment_plan',
        'status',
        'allocated_at',
        'notes',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance' => 'decimal:2',
        'payment_plan' => PaymentPlan::class,
        'status' => AllocationStatus::class,
        'allocated_at' => 'date',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function realtor(): BelongsTo
    {
        return $this->belongsTo(Realtor::class);
    }

    public function allocator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function paidAmount(): float
    {
        return (float) $this->payments()
            ->where('status', PaymentStatus::Confirmed->value)
            ->sum('amount');
    }

    public function outstandingAmount(): float
    {
        return max(0, (float) $this->total_amount - $this->paidAmount());
    }

    public function paymentProgress(): float
    {
        $total = (float) $this->total_amount;

        if ($total <= 0) {
            return 0.0;
        }

        return round(min(100, ($this->paidAmount() / $total) * 100), 2);
    }

    public function syncPaymentTotals(): void
    {
        $paid = $this->paidAmount();
        $balance = max(0, (float) $this->total_amount - $paid);
        $currentStatus = $this->status?->value ?? $this->status;
        $nextStatus = $currentStatus;

        if ($balance <= 0) {
            $nextStatus = AllocationStatus::Completed;
        } elseif ($currentStatus === AllocationStatus::Completed->value) {
            $nextStatus = AllocationStatus::Active;
        }

        $this->forceFill([
            'amount_paid' => $paid,
            'balance' => $balance,
            'status' => $nextStatus,
        ])->save();
    }
}
