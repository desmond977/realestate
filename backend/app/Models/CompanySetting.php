<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_name',
        'company_email',
        'company_phone',
        'company_address',
        'company_logo',
        'target_type',
        'target_amount',
        'brand_color',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
    ];
}
