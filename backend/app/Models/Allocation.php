<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

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
    use HasFactory, SoftDeletes, BelongsToTenant;

    public const PAYMENT_DURATIONS = [
        'one_time',
        '1_week',
        '2_weeks',
        '3_weeks',
        '1_month',
        '2_months',
        '3_months',
        '4_months',
        '5_months',
        '6_months',
        '12_months',
        'custom',
    ];

    public const PAYMENT_DURATION_INTERVALS = [
        'one_time' => ['value' => 0, 'unit' => 'days'],
        '1_week' => ['value' => 1, 'unit' => 'weeks'],
        '2_weeks' => ['value' => 2, 'unit' => 'weeks'],
        '3_weeks' => ['value' => 3, 'unit' => 'weeks'],
        '1_month' => ['value' => 1, 'unit' => 'months'],
        '2_months' => ['value' => 2, 'unit' => 'months'],
        '3_months' => ['value' => 3, 'unit' => 'months'],
        '4_months' => ['value' => 4, 'unit' => 'months'],
        '5_months' => ['value' => 5, 'unit' => 'months'],
        '6_months' => ['value' => 6, 'unit' => 'months'],
        '12_months' => ['value' => 12, 'unit' => 'months'],
    ];

    public const CUSTOM_DURATION_UNITS = [
        'days',
        'weeks',
        'months',
        'years',
    ];

    public const PAYMENT_DURATION_LABELS = [
        'one_time' => 'One-time Payment',
        '1_week' => '1 Week',
        '2_weeks' => '2 Weeks',
        '3_weeks' => '3 Weeks',
        '1_month' => '1 Month',
        '2_months' => '2 Months',
        '3_months' => '3 Months',
        '4_months' => '4 Months',
        '5_months' => '5 Months',
        '6_months' => '6 Months',
        '12_months' => '12 Months (1 Year)',
        'custom' => 'Custom',
    ];

    protected $fillable = [
        'property_id',
        'client_id',
        'realtor_id',
        'allocated_by',
        'total_amount',
        'amount_paid',
        'balance',
        'payment_plan',
        'payment_duration',
        'custom_duration_value',
        'custom_duration_unit',
        'status',
        'allocated_at',
        'notes',
        'payment_screenshot',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'balance' => 'decimal:2',
        'payment_plan' => PaymentPlan::class,
        'custom_duration_value' => 'integer',
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

    public function documentSettings(): HasMany
    {
        return $this->hasMany(AllocationDocument::class);
    }

    public function generatedDocuments(): HasMany
    {
        return $this->hasMany(GeneratedDocument::class);
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

    public function paymentDurationLabel(): string
    {
        if ($this->payment_duration === 'custom') {
            $value = $this->custom_duration_value;
            $unit = $this->custom_duration_unit;

            return $value && $unit ? sprintf('%d %s', $value, ucfirst($unit)) : 'Custom';
        }

        return self::PAYMENT_DURATION_LABELS[$this->payment_duration] ?? 'One-time Payment';
    }

    /**
     * @return array{value:int, unit:string}
     */
    public function paymentDurationInterval(): array
    {
        if ($this->payment_duration === 'custom') {
            return [
                'value' => (int) $this->custom_duration_value,
                'unit' => (string) $this->custom_duration_unit,
            ];
        }

        return self::PAYMENT_DURATION_INTERVALS[$this->payment_duration] ?? self::PAYMENT_DURATION_INTERVALS['one_time'];
    }
}
