<?php

namespace App\Http\Requests\Allocation;

use App\Models\Allocation;
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
            'payment_duration' => ['sometimes', 'required', Rule::in(Allocation::PAYMENT_DURATIONS)],
            'custom_duration_value' => [
                'nullable',
                'required_if:payment_duration,custom',
                'integer',
                'min:1',
            ],
            'custom_duration_unit' => [
                'nullable',
                'required_if:payment_duration,custom',
                Rule::in(Allocation::CUSTOM_DURATION_UNITS),
            ],
            'payment_status' => ['sometimes', Rule::in(['paid', 'unpaid', 'part_payment'])],
            'initial_payment_amount' => ['nullable', 'numeric', 'min:0.01'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'payment_screenshot' => [
                Rule::requiredIf(fn () => $this->isRecordingPayment()),
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,webp,gif,svg',
                'max:2048',
            ],
        ];
    }

    private function isRecordingPayment(): bool
    {
        return (float) $this->input('initial_payment_amount', $this->input('amount', 0)) > 0;
    }
}
