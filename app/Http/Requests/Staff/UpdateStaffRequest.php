<?php

namespace App\Http\Requests\Staff;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Obtener el ID del staff desde la ruta
        $staffId = $this->route('id');

        return [
            'user_id' => ['sometimes', 'required', 'exists:users,id', Rule::unique('staff', 'user_id')->ignore($staffId)],
            'employee_number' => [
                'nullable', 
                'string', 
                'max:255', 
                Rule::unique('staff', 'employee_number')->ignore($staffId)->whereNull('deleted_at')
            ],
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'document_type' => 'sometimes|required|in:ci,nit,passport,other',
            'document_number' => [
                'sometimes', 
                'required', 
                'string', 
                'max:255', 
                Rule::unique('staff', 'document_number')->ignore($staffId)->whereNull('deleted_at')
            ],
            'birth_date' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'nationality' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'mobile' => 'nullable|string|max:20',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'hire_date' => 'sometimes|required|date',
            'contract_start_date' => 'nullable|date',
            'contract_end_date' => 'nullable|date|after:contract_start_date',
            'contract_type' => 'nullable|in:full_time,part_time,contractor,intern',
            'position' => 'nullable|string|max:255',
            'area_id' => 'nullable|exists:areas,id',
            'job_description' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'is_active' => 'nullable|boolean',
            'termination_date' => 'nullable|date|after:hire_date',
            'termination_reason' => 'nullable|string',
            'notes' => 'nullable|string',
            'custom_fields' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'employee_number.unique' => 'Este número de empleado ya está en uso. Por favor, utiliza otro número.',
            'document_number.unique' => 'Este número de documento ya está registrado. Por favor, verifica el número.',
            'user_id.unique' => 'Este usuario ya está asignado a otro personal.',
            'first_name.required' => 'El nombre es obligatorio.',
            'last_name.required' => 'El apellido es obligatorio.',
            'document_type.required' => 'El tipo de documento es obligatorio.',
            'document_number.required' => 'El número de documento es obligatorio.',
            'hire_date.required' => 'La fecha de ingreso es obligatoria.',
            'hire_date.date' => 'La fecha de ingreso debe ser una fecha válida.',
        ];
    }
}
