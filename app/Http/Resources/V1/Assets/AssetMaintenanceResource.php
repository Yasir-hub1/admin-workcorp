<?php

namespace App\Http\Resources\V1\Assets;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetMaintenanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'asset_id' => $this->asset_id,
            'type' => $this->type,
            'scheduled_date' => $this->scheduled_date->format('Y-m-d'),
            'completed_date' => $this->completed_date?->format('Y-m-d'),
            'description' => $this->description,
            'cost' => (float) $this->cost,
            'provider' => $this->provider,
            'provider_contact' => $this->provider_contact,
            'next_maintenance_date' => $this->next_maintenance_date?->format('Y-m-d'),
            'notes' => $this->notes,
            'performed_by' => $this->whenLoaded('performedBy', function () {
                return $this->performedBy ? [
                    'id' => $this->performedBy->id,
                    'name' => $this->performedBy->name,
                    'email' => $this->performedBy->email,
                ] : null;
            }),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}

