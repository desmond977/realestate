<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AllocationDocument extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'allocation_id',
        'document_template_id',
        'enabled',
        'enabled_by',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(Allocation::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class, 'document_template_id');
    }

    public function enabler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enabled_by');
    }
}
