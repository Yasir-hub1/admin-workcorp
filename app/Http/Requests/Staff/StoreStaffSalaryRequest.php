<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;

class StoreStaffSalaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'amount' => 'required|numeric|min:0',
            'currency' => 'nullable|string|size:3|in:BOB,USD,EUR',
            'effective_date' => 'required|date',
            'end_date' => 'nullable|date|after:effective_date',
            'salary_type' => 'required|in:monthly,biweekly,weekly,annual',
            'notes' => 'nullable|string',
        ];
    }
}
