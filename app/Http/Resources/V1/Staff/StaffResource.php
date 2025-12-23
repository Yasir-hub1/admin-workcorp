<?php

namespace App\Http\Resources\V1\Staff;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', function () {
                return $this->user ? [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                ] : null;
            }),
            'employee_number' => $this->employee_number,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'document_type' => $this->document_type,
            'document_number' => $this->document_number,
            'birth_date' => $this->birth_date?->format('Y-m-d'),
            'gender' => $this->gender,
            'nationality' => $this->nationality,
            'phone' => $this->phone,
            'mobile' => $this->mobile,
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'address' => $this->address,
            'city' => $this->city,
            'state' => $this->state,
            'postal_code' => $this->postal_code,
            'country' => $this->country,
            'hire_date' => $this->hire_date?->format('Y-m-d'),
            'contract_start_date' => $this->contract_start_date?->format('Y-m-d'),
            'contract_end_date' => $this->contract_end_date?->format('Y-m-d'),
            'contract_type' => $this->contract_type,
            'position' => $this->position,
            'area' => $this->whenLoaded('area', function () {
                return $this->area ? [
                    'id' => $this->area->id,
                    'name' => $this->area->name,
                    'code' => $this->area->code,
                ] : null;
            }),
            'area_id' => $this->area_id,
            'job_description' => $this->job_description,
            'latitude' => $this->latitude ? (float) $this->latitude : null,
            'longitude' => $this->longitude ? (float) $this->longitude : null,
            'location_updated_at' => $this->location_updated_at?->toDateTimeString(),
            'is_active' => $this->is_active,
            'termination_date' => $this->termination_date?->format('Y-m-d'),
            'termination_reason' => $this->termination_reason,
            'notes' => $this->notes,
            'custom_fields' => $this->custom_fields,
            'current_salary' => $this->whenLoaded('latestSalary', function () {
                return $this->latestSalary ? [
                    'id' => $this->latestSalary->id,
                    'amount' => (float) $this->latestSalary->amount,
                    'currency' => $this->latestSalary->currency,
                    'effective_date' => $this->latestSalary->effective_date?->format('Y-m-d'),
                    'salary_type' => $this->latestSalary->salary_type,
                    'is_active' => $this->latestSalary->is_active,
                ] : null;
            }),
            'salaries_count' => $this->whenLoaded('salaries', fn() => $this->salaries->count()),
            'managed_areas' => $this->whenLoaded('managedAreas', function () {
                return $this->managedAreas->map(function ($area) {
                    return [
                        'id' => $area->id,
                        'name' => $area->name,
                        'code' => $area->code,
                        'assigned_at' => $area->pivot->assigned_at?->format('Y-m-d'),
                    ];
                });
            }),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
