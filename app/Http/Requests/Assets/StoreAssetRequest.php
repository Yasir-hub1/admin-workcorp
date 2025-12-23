<?php

namespace App\Http\Requests\Assets;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255|unique:assets,code',
            'serial_number' => 'nullable|string|max:255',
            'category' => 'required|string|max:255',
            'brand' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'acquisition_cost' => 'required|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'supplier' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'purchase_order' => 'nullable|string|max:255',
            'payment_method' => 'nullable|string|max:255',
            'current_value' => 'nullable|numeric|min:0',
            'useful_life_years' => 'nullable|integer|min:1',
            'status' => 'required|in:available,in_use,maintenance,repair,decommissioned',
            'area_id' => 'nullable|exists:areas,id',
            'location' => 'nullable|string|max:255',
            'assigned_to' => 'nullable|exists:users,id',
            'warranty_start_date' => 'nullable|date',
            'warranty_end_date' => 'nullable|date|after_or_equal:warranty_start_date',
            'warranty_terms' => 'nullable|string',
        ];
    }
}

