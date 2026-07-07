<?php

namespace App\Http\Requests\Allocation;

use App\Enums\PaymentPlan;
use App\Models\Allocation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StoreAllocationRequest extends FormRequest
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
            'property_id' => ['required', 'integer', 'exists:properties,id'],
            'client_id' => ['required', 'integer', 'exists:clients,id'],
            'realtor_id' => ['nullable', 'integer', 'exists:realtors,id'],
            'total_amount' => ['sometimes', 'numeric', 'min:0.01'],
            'payment_plan' => ['required', new Enum(PaymentPlan::class)],
            'payment_duration' => ['required', Rule::in(Allocation::PAYMENT_DURATIONS)],
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
            'allocated_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'initial_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'paid_at' => ['nullable', 'date'],
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
        if ($this->input('payment_status') === 'unpaid') {
            return false;
        }

        return in_array($this->input('payment_status'), ['paid', 'part_payment'], true)
            || (! $this->has('payment_status') && (float) $this->input('initial_payment_amount', 0) > 0);
    }
}
