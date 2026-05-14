<?php

namespace App\Models;

use App\Enums\AllocationStatus;
use App\Enums\PaymentPlan;
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

    public function allocator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
