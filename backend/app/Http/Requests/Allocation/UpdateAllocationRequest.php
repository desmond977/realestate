<?php

namespace App\Http\Requests\Allocation;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAllocationRequest extends FormRequest
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
            'payment_status' => ['sometimes', Rule::in(['paid', 'unpaid', 'part_payment'])],
            'initial_payment_amount' => ['nullable', 'numeric', 'min:0.01'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'transaction_reference' => ['nullable', 'string', 'max:255', 'unique:payments,transaction_reference'],
            'paid_at' => ['nullable', 'date'],
            'payment_notes' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
