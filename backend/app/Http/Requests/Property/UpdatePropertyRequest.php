<?php

namespace App\Http\Requests\Property;

use App\Enums\PropertyStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdatePropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('property'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'string', 'max:100'],
            'location' => ['sometimes', 'string', 'max:255'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'property_count' => ['sometimes', 'integer', 'min:1'],
            'available_count' => ['nullable', 'integer', 'min:0'],
            'reserved_count' => ['nullable', 'integer', 'min:0'],
            'sold_count' => ['nullable', 'integer', 'min:0'],
            'status' => ['sometimes', new Enum(PropertyStatus::class)],
            'description' => ['nullable', 'string'],
            'land_size' => ['nullable', 'string', 'max:255'],
            'document_type' => ['nullable', 'string', 'max:255'],
            'image' => [
                'nullable',
                function ($attribute, $value, $fail) {
                    if (is_string($value) || $value === null) {
                        return;
                    }

                    if (!($value instanceof \Illuminate\Http\UploadedFile)) {
                        $fail('The '.$attribute.' must be a valid file or image path.');
                        return;
                    }

                    if (!$value->isValid()) {
                        $fail('The '.$attribute.' upload failed.');
                        return;
                    }

                    $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
                    if (!in_array(strtolower($value->extension()), $allowed, true)) {
                        $fail('The '.$attribute.' must be a file of type: '.implode(', ', $allowed).'.');
                    }

                    if ($value->getSize() > 4 * 1024 * 1024) {
                        $fail('The '.$attribute.' may not be greater than 4096 kilobytes.');
                    }
                },
            ],
        ];
    }
}
