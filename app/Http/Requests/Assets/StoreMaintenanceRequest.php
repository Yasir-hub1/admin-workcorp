<?php

namespace App\Http\Requests\Assets;

use Illuminate\Foundation\Http\FormRequest;

class StoreMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|in:preventive,corrective',
            'scheduled_date' => 'required|date',
            'completed_date' => 'nullable|date|after_or_equal:scheduled_date',
            'description' => 'required|string',
            'cost' => 'nullable|numeric|min:0',
            'provider' => 'nullable|string|max:255',
            'provider_contact' => 'nullable|string|max:255',
            'next_maintenance_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string',
        ];
    }
}

