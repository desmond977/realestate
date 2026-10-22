<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentalPaymentPeriod extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'rental_agreement_id',
        'period_start',
        'period_end',
        'due_date',
        'amount_due',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'due_date' => 'date',
        'amount_due' => 'decimal:2',
    ];

    public function rentalAgreement(): BelongsTo
    {
        return $this->belongsTo(RentalAgreement::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(RentalPayment::class);
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

        if ($this->due_date->isPast() && ! $this->due_date->isToday()) {
            return 'overdue';
        }

        if ($paid > 0) {
            return 'partial';
        }

        return 'due';
    }
}
