<?php

namespace App\Http\Requests\Property;

use App\Enums\PropertyStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdatePropertyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
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
            'price' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', new Enum(PropertyStatus::class)],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string', 'max:2048'],
        ];
    }
}
