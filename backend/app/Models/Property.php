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
        'property_count',
        'available_count',
        'reserved_count',
        'sold_count',
        'status',
        'description',
        'image',
        'land_size',
        'document_type',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'property_count' => 'integer',
        'available_count' => 'integer',
        'reserved_count' => 'integer',
        'sold_count' => 'integer',
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
