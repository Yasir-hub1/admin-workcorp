<?php

namespace App\Http\Requests\Services;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $serviceId = $this->route('id') ?? $this->route('service')?->id;

        return [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['nullable', 'string', 'max:255', Rule::unique('services', 'code')->ignore($serviceId)],
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'billing_type' => 'nullable|in:monthly,annual,project,hourly',
            'standard_duration' => 'nullable|integer|min:1',
            'client_id' => 'nullable|exists:clients,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'contract_duration_months' => 'nullable|integer|min:1',
            'contract_amount' => 'nullable|numeric|min:0',
            'payment_frequency' => 'nullable|in:monthly,quarterly,annual,one_time',
            'status' => 'nullable|in:active,expiring,expired,suspended,cancelled',
            'auto_renewal' => 'nullable|boolean',
            'billing_day' => 'nullable|integer|min:1|max:31',
            'assigned_to' => 'nullable|exists:users,id',
            'area_id' => 'nullable|exists:areas,id',
            'sla_response_time' => 'nullable|integer|min:0',
            'sla_availability' => 'nullable|numeric|min:0|max:100',
            'sla_penalties' => 'nullable|string',
        ];
    }
}

