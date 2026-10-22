<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceChargeReceipt extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'service_charge_payment_id',
        'issued_by',
        'receipt_number',
        'issued_at',
        'snapshot',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'snapshot' => 'array',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(ServiceChargePayment::class, 'service_charge_payment_id');
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
