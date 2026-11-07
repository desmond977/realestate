<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceCharge extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'category_id',
        'rental_agreement_id',
        'rental_property_id',
        'client_id',
        'description',
        'billing_period_start',
        'billing_period_end',
        'billing_month',
        'billing_date',
        'due_date',
        'amount_due',
        'notes',
    ];

    protected $casts = [
        'billing_period_start' => 'date',
        'billing_period_end' => 'date',
        'billing_date' => 'date',
        'due_date' => 'date',
        'amount_due' => 'decimal:2',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceChargeCategory::class, 'category_id')->withTrashed();
    }

    public function rentalAgreement(): BelongsTo
    {
        return $this->belongsTo(RentalAgreement::class);
    }

    public function rentalProperty(): BelongsTo
    {
        return $this->belongsTo(RentalProperty::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ServiceChargePayment::class);
    }

    public function paymentProofSubmissions(): HasMany
    {
        return $this->hasMany(PaymentProofSubmission::class);
    }

    public function confirmedAmountPaid(): float
    {
        return (float) $this->payments()
            ->where('status', 'confirmed')
            ->sum('amount');
    }

    public function outstandingBalance(): float
    {
        return max(0, round((float) $this->amount_due - $this->confirmedAmountPaid(), 2));
    }

    public function paymentStatus(): string
    {
        $paid = $this->confirmedAmountPaid();

        if ($paid >= (float) $this->amount_due) {
            return 'paid';
        }

        if ($paid > 0) {
            return 'partial';
        }

        return $this->due_date->isPast() && ! $this->due_date->isToday() ? 'non_payment' : 'unpaid_pending';
    }
}
