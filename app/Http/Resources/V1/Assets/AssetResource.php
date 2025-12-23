<?php

namespace App\Http\Resources\V1\Assets;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'serial_number' => $this->serial_number,
            'category' => $this->category,
            'brand' => $this->brand,
            'model' => $this->model,
            'description' => $this->description,
            'acquisition_cost' => (float) $this->acquisition_cost,
            'purchase_date' => $this->purchase_date?->format('Y-m-d'),
            'supplier' => $this->supplier,
            'invoice_number' => $this->invoice_number,
            'purchase_order' => $this->purchase_order,
            'payment_method' => $this->payment_method,
            'current_value' => (float) $this->current_value,
            'useful_life_years' => $this->useful_life_years,
            'depreciation' => (float) $this->calculateDepreciation(),
            'status' => $this->status,
            'area' => $this->whenLoaded('area', function () {
                return $this->area ? [
                    'id' => $this->area->id,
                    'name' => $this->area->name,
                ] : null;
            }),
            'location' => $this->location,
            'assigned_user' => $this->whenLoaded('assignedUser', function () {
                return $this->assignedUser ? [
                    'id' => $this->assignedUser->id,
                    'name' => $this->assignedUser->name,
                    'email' => $this->assignedUser->email,
                ] : null;
            }),
            'warranty_start_date' => $this->warranty_start_date?->format('Y-m-d'),
            'warranty_end_date' => $this->warranty_end_date?->format('Y-m-d'),
            'warranty_terms' => $this->warranty_terms,
            'maintenances_count' => $this->whenLoaded('maintenances', fn() => $this->maintenances->count()),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}

