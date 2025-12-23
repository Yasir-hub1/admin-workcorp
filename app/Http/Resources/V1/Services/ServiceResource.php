<?php

namespace App\Http\Resources\V1\Services;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'description' => $this->description,
            'category' => $this->category,
            'price' => (float) $this->price,
            'billing_type' => $this->billing_type,
            'standard_duration' => $this->standard_duration,
            'sla_response_time' => $this->sla_response_time,
            'sla_availability' => $this->sla_availability ? (float) $this->sla_availability : null,
            'sla_penalties' => $this->sla_penalties,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}

