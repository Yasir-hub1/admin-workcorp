<?php

namespace App\Http\Requests\Assets;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $assetId = $this->route('asset')->id ?? null;

        return [
            'name' => 'sometimes|required|string|max:255',
            'code' => ['nullable', 'string', 'max:255', Rule::unique('assets', 'code')->ignore($assetId)],
            'serial_number' => 'nullable|string|max:255',
            'category' => 'sometimes|required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'acquisition_cost' => 'sometimes|required|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'supplier' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'purchase_order' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string|max:255',
            'current_value' => 'nullable|numeric|min:0',
            'useful_life_years' => 'nullable|integer|min:1',
            'status' => 'sometimes|required|in:available,in_use,maintenance,repair,decommissioned',
            'area_id' => 'nullable|exists:areas,id',
            'location' => 'nullable|string|max:255',
            'assigned_to' => 'nullable|exists:users,id',
            'warranty_start_date' => 'nullable|date',
            'warranty_end_date' => 'nullable|date|after_or_equal:warranty_start_date',
            'warranty_terms' => 'nullable|string',
        ];
    }
}

