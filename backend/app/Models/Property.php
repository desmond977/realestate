<?php

namespace App\Models;

use App\Enums\PropertyStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Property extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'type',
        'location',
        'price',
        'status',
        'description',
        'image',
        'land_size',
        'document_type',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'status' => PropertyStatus::class,
    ];

    public function allocations(): HasMany
    {
        return $this->hasMany(Allocation::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
