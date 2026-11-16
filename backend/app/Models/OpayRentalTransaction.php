<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpayRentalTransaction extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'rental_payment_period_id', 'client_id', 'reference', 'order_no', 'transaction_id',
        'amount', 'currency', 'status', 'cashier_url', 'opay_status', 'failure_reason',
        'provider_payload', 'expires_at', 'verified_at', 'rental_payment_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'provider_payload' => 'array',
        'expires_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    public function period(): BelongsTo
    {
        return $this->belongsTo(RentalPaymentPeriod::class, 'rental_payment_period_id');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function rentalPayment(): BelongsTo
    {
        return $this->belongsTo(RentalPayment::class);
    }
}
