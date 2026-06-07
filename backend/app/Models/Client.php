<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class Client extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'address',
        'occupation',
        'realtor_id',
        'profile_image',
        'theme_mode',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    protected $appends = [
        'full_name',
        'name',
        'profile_image_url',
        'role',
    ];

    public function allocations(): HasMany
    {
        return $this->hasMany(Allocation::class);
    }

    public function realtor(): BelongsTo
    {
        return $this->belongsTo(Realtor::class);
    }

    public function realtors(): BelongsToMany
    {
        return $this->belongsToMany(Realtor::class)
            ->withPivot('assigned_at')
            ->withTimestamps();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function receipts(): HasManyThrough
    {
        return $this->hasManyThrough(Receipt::class, Payment::class, 'client_id', 'payment_id');
    }

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function getNameAttribute(): string
    {
        return $this->full_name;
    }

    public function getRoleAttribute(): string
    {
        return 'client';
    }

    public function getProfileImageUrlAttribute(): ?string
    {
        if (! $this->profile_image) {
            return null;
        }

        if (filter_var($this->profile_image, FILTER_VALIDATE_URL)) {
            return $this->profile_image;
        }

        return Storage::disk('public')->url($this->profile_image);
    }

    public function isClient(): bool
    {
        return true;
    }

    public function totalPaid(): float
    {
        return (float) $this->payments()
            ->where('status', \App\Enums\PaymentStatus::Confirmed->value)
            ->sum('amount');
    }

    public function outstandingBalance(): float
    {
        return (float) $this->allocations()->sum('balance');
    }

    public function totalAllocatedAmount(): float
    {
        return (float) $this->allocations()->sum('total_amount');
    }

    public function paymentProgress(): float
    {
        $total = $this->totalAllocatedAmount();

        if ($total <= 0) {
            return 0.0;
        }

        return round(min(100, ($this->totalPaid() / $total) * 100), 2);
    }

    public function hasOutstandingBalance(): bool
    {
        return $this->outstandingBalance() > 0;
    }

    public function primaryRealtor(): ?Realtor
    {
        return $this->realtor ?: $this->realtors()->oldest('client_realtor.assigned_at')->first();
    }
}
