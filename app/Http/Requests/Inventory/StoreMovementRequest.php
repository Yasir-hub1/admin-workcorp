<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;

class StoreMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|in:entry,exit,transfer,adjustment',
            'quantity' => 'required|integer|min:1',
            'unit_cost' => 'required|numeric|min:0',
            'total_cost' => 'nullable|numeric|min:0',
            'movement_date' => 'nullable|date',
            'reference' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'from_warehouse' => 'nullable|string|max:255',
            'to_warehouse' => 'nullable|string|max:255|different:from_warehouse',
        ];
    }
}

