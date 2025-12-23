<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:255|unique:inventory_items,code',
            'sku' => 'nullable|string|max:255|unique:inventory_items,sku',
            'category' => 'nullable|string|max:255',
            'brand' => 'nullable|string|max:255',
            'model' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'purchase_cost' => 'required|numeric|min:0',
            'purchase_date' => 'nullable|date',
            'supplier' => 'nullable|string|max:255',
            'sale_price' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'current_stock' => 'nullable|integer|min:0',
            'min_stock' => 'required|integer|min:0',
            'max_stock' => 'nullable|integer|min:0|gt:min_stock',
            'unit_of_measure' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'warehouse' => 'nullable|string|max:255',
        ];
    }
}

