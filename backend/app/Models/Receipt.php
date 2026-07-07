<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Receipt extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'payment_id',
        'issued_by',
        'receipt_number',
        'issued_at',
        'metadata',
        'snapshot',
    ];

    protected $casts = [
        'issued_at' => 'datetime',
        'metadata' => 'array',
        'snapshot' => 'array',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
