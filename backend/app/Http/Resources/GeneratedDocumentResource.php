<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GeneratedDocumentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'allocation_id' => $this->allocation_id,
            'customer_id' => $this->customer_id,
            'document_template_id' => $this->document_template_id,
            'document_type' => $this->document_type,
            'document_name' => $this->document_name,
            'generated_at' => $this->generated_at?->toISOString(),
            'file_name' => $this->file_name,
            'generated_by' => new UserResource($this->whenLoaded('generator')),
            'template' => new DocumentTemplateResource($this->whenLoaded('template')),
        ];
    }
}
