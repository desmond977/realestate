<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneratedDocument extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'allocation_id',
        'customer_id',
        'document_template_id',
        'document_type',
        'document_name',
        'generated_by',
        'generated_at',
        'file_name',
        'data_snapshot',
        'content_html',
    ];

    protected $casts = [
        'generated_at' => 'datetime',
        'data_snapshot' => 'array',
    ];

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(Allocation::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'customer_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(DocumentTemplate::class, 'document_template_id')->withTrashed();
    }

    public function generator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
