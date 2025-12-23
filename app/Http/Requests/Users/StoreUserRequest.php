<?php

namespace App\Http\Requests\Users;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Se puede ajustar según permisos
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'area_id' => 'nullable|exists:areas,id',
            'staff_id' => [
                'required',
                'exists:staff,id',
                Rule::unique('staff', 'user_id')->whereNull('user_id'),
            ],
            'is_active' => 'nullable|boolean',
            'language' => 'nullable|string|max:10',
            'timezone' => 'nullable|string|max:50',
            'roles' => 'nullable|array',
            'roles.*' => 'exists:roles,name',
        ];
    }

    public function messages(): array
    {
        return [
            'staff_id.unique' => 'Este personal ya tiene un usuario asignado. Por favor selecciona otro personal.',
        ];
    }
}
