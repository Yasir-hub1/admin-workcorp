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
            'sla_response_time' => 'nullable|integer|min:0',
            'sla_availability' => 'nullable|numeric|min:0|max:100',
            'sla_penalties' => 'nullable|string',
        ];
    }
}

