<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceChargeCategory extends Model
{
    use BelongsToTenant, HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'is_system',
    ];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public static function ensureDefaults(): void
    {
        foreach ([
            ['name' => 'Security', 'description' => 'Security and access control services.'],
            ['name' => 'Waste Management', 'description' => 'Waste collection and disposal services.'],
            ['name' => 'Maintenance', 'description' => 'Shared property maintenance services.'],
            ['name' => 'Other', 'description' => 'Other approved service charges.'],
        ] as $category) {
            static::query()->firstOrCreate(
                ['name' => $category['name'], 'is_system' => true],
                ['description' => $category['description']]
            );
        }
    }

    public function charges(): HasMany
    {
        return $this->hasMany(ServiceCharge::class, 'category_id');
    }
}
