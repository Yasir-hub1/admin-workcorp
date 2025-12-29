<?php

namespace App\Http\Requests\Clients;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('document_type') && is_string($this->document_type)) {
            $this->merge([
                'document_type' => strtolower(trim($this->document_type)),
            ]);
        }
    }

    public function rules(): array
    {
        // Obtener el ID del cliente desde la ruta
        $clientId = $this->route('id');

        return [
            'business_name' => 'sometimes|required|string|max:255',
            'legal_name' => 'nullable|string|max:255',
            'document_type' => 'sometimes|required|in:nit,ci,other',
            'document_number' => [
                'sometimes', 
                'required', 
                'string', 
                'max:255', 
                Rule::unique('clients', 'document_number')->ignore($clientId)->whereNull('deleted_at')
            ],
            'client_type' => 'sometimes|required|in:company,individual',
            'industry' => 'nullable|string|max:255',
            'company_size' => 'nullable|in:small,medium,large',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'fiscal_address' => 'nullable|string',
            'website' => 'nullable|url|max:255',
            'registration_date' => 'nullable|date',
            'source' => 'nullable|in:referred,marketing,direct_sale',
            'category' => 'nullable|in:A,B,C',
            'status' => 'sometimes|required|in:active,inactive,prospect,lost',
            'assigned_to' => 'nullable|exists:users,id',
            'area_id' => 'nullable|exists:areas,id',
            'notes' => 'nullable|string',
            'contacts' => 'nullable|array',
            'contacts.*.name' => 'required_with:contacts|string|max:255',
            'contacts.*.position' => 'nullable|string|max:255',
            'contacts.*.phone' => 'nullable|string|max:255',
            'contacts.*.email' => 'nullable|email|max:255',
            'contacts.*.is_primary' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'document_number.unique' => 'Este número de documento ya está registrado. Por favor, verifica el número.',
            'business_name.required' => 'La razón social o nombre completo es obligatorio.',
            'document_type.required' => 'El tipo de documento es obligatorio.',
            'document_number.required' => 'El número de documento es obligatorio.',
            'client_type.required' => 'El tipo de cliente es obligatorio.',
            'status.required' => 'El estado es obligatorio.',
        ];
    }
}

