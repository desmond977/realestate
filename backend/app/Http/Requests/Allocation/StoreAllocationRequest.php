<?php

namespace App\Http\Requests\Allocation;

use App\Enums\PaymentPlan;
use Illuminate\Foundation\Http\FormRequest;
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
            'total_amount' => ['required', 'numeric', 'min:0.01'],
            'payment_plan' => ['required', new Enum(PaymentPlan::class)],
            'allocated_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'initial_payment_amount' => ['nullable', 'numeric', 'min:0'],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'transaction_reference' => ['nullable', 'string', 'max:255', 'unique:payments,transaction_reference'],
            'paid_at' => ['nullable', 'date'],
            'payment_notes' => ['nullable', 'string'],
        ];
    }
}
