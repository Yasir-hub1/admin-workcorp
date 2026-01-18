<?php

namespace App\Http\Requests\Expenses;

use Illuminate\Foundation\Http\FormRequest;

class ApproveExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        
        // Verificar si tiene alguno de los permisos de aprobación
        return $user->hasPermission('expenses.approve-level-1') ||
               $user->hasPermission('expenses.approve-level-2') ||
               $user->hasPermission('expenses.approve-level-3');
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:approved,rejected',
            'comments' => 'nullable|string',
        ];
    }
}

