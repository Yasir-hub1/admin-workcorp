<?php

namespace App\Http\Requests\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateRequestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = Auth::user();
        $id = $this->route('id') ?? $this->route('request');
        
        // Super Admin siempre puede editar cualquier solicitud
        if ($user->isSuperAdmin()) {
            return true;
        }
        
        // Si tenemos el ID, buscar el modelo
        if ($id) {
            $requestModel = \App\Models\Request::find($id);
            if ($requestModel) {
                // Otros usuarios solo pueden editar sus propias solicitudes si tienen permiso
                return $user->hasPermission('requests.edit') && $requestModel->user_id === $user->id;
            }
        }
        
        return $user->hasPermission('requests.edit');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i|after:start_time',
            'days_requested' => 'nullable|integer|min:0',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'title.string' => 'El título debe ser texto',
            'start_date.date' => 'La fecha de inicio debe ser una fecha válida',
            'end_date.after_or_equal' => 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
            'end_time.after' => 'La hora de fin debe ser posterior a la hora de inicio',
        ];
    }
}
