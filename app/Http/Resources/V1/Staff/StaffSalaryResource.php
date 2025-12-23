<?php

namespace App\Http\Resources\V1\Staff;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffSalaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'staff_id' => $this->staff_id,
            'staff' => $this->whenLoaded('staff', function () {
                return $this->staff ? [
                    'id' => $this->staff->id,
                    'employee_number' => $this->staff->employee_number,
                    'user' => $this->staff->user ? [
                        'name' => $this->staff->user->name,
                        'email' => $this->staff->user->email,
                    ] : null,
                ] : null;
            }),
            'amount' => (float) $this->amount,
            'currency' => $this->currency,
            'effective_date' => $this->effective_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'salary_type' => $this->salary_type,
            'salary_type_label' => $this->salary_type === 'monthly' ? 'Mensual' :
                                   ($this->salary_type === 'biweekly' ? 'Quincenal' :
                                   ($this->salary_type === 'weekly' ? 'Semanal' : 'Anual')),
            'notes' => $this->notes,
            'approved_by' => $this->approved_by,
            'approvedBy' => $this->whenLoaded('approvedBy', function () {
                return $this->approvedBy ? [
                    'id' => $this->approvedBy->id,
                    'name' => $this->approvedBy->name,
                    'email' => $this->approvedBy->email,
                ] : null;
            }),
            'approved_at' => $this->approved_at?->toDateTimeString(),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}
