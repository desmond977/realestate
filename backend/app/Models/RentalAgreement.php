<?php

namespace App\Models;

use App\Enums\RentalFrequency;
use App\Enums\RentalStatus;
use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RentalAgreement extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'rental_property_id',
        'client_id',
        'rental_amount',
        'rental_frequency',
        'lease_start_date',
        'lease_end_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'rental_amount' => 'decimal:2',
        'rental_frequency' => RentalFrequency::class,
        'lease_start_date' => 'date',
        'lease_end_date' => 'date',
        'status' => RentalStatus::class,
    ];

    public function rentalProperty(): BelongsTo
    {
        return $this->belongsTo(RentalProperty::class);
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function paymentPeriods(): HasMany
    {
        return $this->hasMany(RentalPaymentPeriod::class);
    }

    public function serviceCharges(): HasMany
    {
        return $this->hasMany(ServiceCharge::class);
    }
}
