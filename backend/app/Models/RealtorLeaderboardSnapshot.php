<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RealtorLeaderboardSnapshot extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'leaderboard_month',
        'leaderboard',
        'entries_count',
        'archived_at',
    ];

    protected $casts = [
        'leaderboard_month' => 'date',
        'leaderboard' => 'array',
        'entries_count' => 'integer',
        'archived_at' => 'datetime',
    ];
}
