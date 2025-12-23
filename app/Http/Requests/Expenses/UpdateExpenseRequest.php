<?php

namespace App\Http\Requests\Expenses;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'description' => 'sometimes|required|string',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'expense_date' => 'sometimes|required|date',
            'category' => 'sometimes|required|string|max:255',
            'subcategory' => 'nullable|string|max:255',
            'area_id' => 'sometimes|required|exists:areas,id',
            'cost_center' => 'nullable|string|max:255',
            'project_id' => 'nullable|integer',
            'document_number' => 'nullable|string|max:255',
            'supplier_ruc_dni' => 'nullable|string|max:255',
            'supplier_name' => 'nullable|string|max:255',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
            'file_type' => 'nullable|in:receipt,invoice,other',
        ];
    }
}

