<?php

namespace App\Http\Requests\Payment;

use App\Enums\PaymentPlan;
use App\Enums\PaymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class StorePaymentRequest extends FormRequest
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
            'allocation_id' => ['required', 'integer', 'exists:allocations,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_type' => ['sometimes', new Enum(PaymentPlan::class)],
            'payment_method' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', new Enum(PaymentStatus::class)],
            'transaction_reference' => ['nullable', 'string', 'max:255', 'unique:payments,transaction_reference'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
