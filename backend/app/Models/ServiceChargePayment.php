<?php

namespace App\Models;

use App\Enums\ServiceChargePaymentStatus;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ServiceChargePayment extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'service_charge_id',
        'recorded_by',
        'amount',
        'paid_at',
        'payment_method',
        'transaction_reference',
        'status',
        'proof_of_payment_path',
        'payment_proof_submission_id',
        'submitted_at',
        'approved_by',
        'approved_at',
        'approval_notes',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'status' => ServiceChargePaymentStatus::class,
    ];

    public function serviceCharge(): BelongsTo
    {
        return $this->belongsTo(ServiceCharge::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(ServiceChargeReceipt::class);
    }

    public function paymentProofSubmission(): HasOne
    {
        return $this->hasOne(PaymentProofSubmission::class);
    }
}
