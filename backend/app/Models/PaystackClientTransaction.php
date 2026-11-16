<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaystackClientTransaction extends Model
{
    protected $fillable = [
        'client_id', 'category', 'rental_payment_period_id', 'service_charge_id', 'reference',
        'provider_transaction_id', 'amount', 'currency', 'status', 'authorization_url', 'access_code',
        'failure_reason', 'provider_payload', 'expires_at', 'verified_at', 'rental_payment_id', 'service_charge_payment_id',
    ];

    protected $casts = ['amount' => 'decimal:2', 'provider_payload' => 'array', 'expires_at' => 'datetime', 'verified_at' => 'datetime'];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function period(): BelongsTo { return $this->belongsTo(RentalPaymentPeriod::class, 'rental_payment_period_id'); }
    public function serviceCharge(): BelongsTo { return $this->belongsTo(ServiceCharge::class); }
    public function rentalPayment(): BelongsTo { return $this->belongsTo(RentalPayment::class); }
    public function serviceChargePayment(): BelongsTo { return $this->belongsTo(ServiceChargePayment::class); }
}
