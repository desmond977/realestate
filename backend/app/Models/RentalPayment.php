<?php

namespace App\Models;

use App\Enums\RentalPaymentStatus;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RentalPayment extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'rental_payment_period_id',
        'recorded_by',
        'amount',
        'paid_at',
        'payment_method',
        'transaction_reference',
        'status',
        'proof_of_payment_path',
        'payment_proof_submission_id',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'status' => RentalPaymentStatus::class,
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(RentalPaymentPeriod::class, 'rental_payment_period_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(RentalReceipt::class);
    }

    public function paymentProofSubmission(): HasOne
    {
        return $this->hasOne(PaymentProofSubmission::class);
    }
}
