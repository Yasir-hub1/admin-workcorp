<?php

namespace App\Http\Resources\V1\Services;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $now = now()->startOfDay();
        $end = $this->end_date ? $this->end_date->copy()->startOfDay() : null;
        $isExpired = $this->status === 'expired' || ($end ? $end->lt($now) : false);
        $isExpiring = $this->status === 'expiring' || ($end ? ($end->gte($now) && $end->lte($now->copy()->addDays(15))) : false);

        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'category' => $this->category,
            'price' => (float) $this->price,
            'billing_type' => $this->billing_type,
            'standard_duration' => $this->standard_duration,
            'client_id' => $this->client_id,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'contract_duration_months' => $this->contract_duration_months,
            'contract_amount' => $this->contract_amount !== null ? (float) $this->contract_amount : null,
            'payment_frequency' => $this->payment_frequency,
            'status' => $this->status,
            'auto_renewal' => (bool) ($this->auto_renewal ?? false),
            'billing_day' => $this->billing_day,
            'assigned_to' => $this->assigned_to,
            'assigned_user' => $this->whenLoaded('assignedUser', function () {
                return $this->assignedUser ? [
                    'id' => $this->assignedUser->id,
                    'name' => $this->assignedUser->name,
                    'email' => $this->assignedUser->email,
                ] : null;
            }),
            'area_id' => $this->area_id,
            'area' => $this->whenLoaded('area', function () {
                return $this->area ? [
                    'id' => $this->area->id,
                    'name' => $this->area->name,
                ] : null;
            }),
            'is_expiring' => $isExpiring,
            'is_expired' => $isExpired,
            'sla_response_time' => $this->sla_response_time,
            'sla_availability' => $this->sla_availability ? (float) $this->sla_availability : null,
            'sla_penalties' => $this->sla_penalties,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}

