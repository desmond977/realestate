<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'company_name',
        'company_email',
        'company_phone',
        'company_address',
        'company_logo',
        'target_type',
        'target_amount',
        'theme_mode',
        'brand_color',
        'rental_management_enabled',
    ];

    protected $casts = [
        'target_amount' => 'decimal:2',
        'rental_management_enabled' => 'boolean',
    ];
}
