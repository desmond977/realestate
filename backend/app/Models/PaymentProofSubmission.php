<?php

namespace App\Models;

use App\Enums\PaymentProofSubmissionStatus;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentProofSubmission extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'client_id',
        'payment_category',
        'rental_payment_period_id',
        'service_charge_id',
        'amount',
        'paid_at',
        'transaction_reference',
        'proof_of_payment_path',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'date',
        'status' => PaymentProofSubmissionStatus::class,
        'reviewed_at' => 'datetime',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function rentalPaymentPeriod(): BelongsTo
    {
        return $this->belongsTo(RentalPaymentPeriod::class);
    }

    public function serviceCharge(): BelongsTo
    {
        return $this->belongsTo(ServiceCharge::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function rentalPayment(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(RentalPayment::class);
    }

    public function serviceChargePayment(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(ServiceChargePayment::class);
    }
}
