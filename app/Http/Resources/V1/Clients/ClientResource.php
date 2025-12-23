<?php

namespace App\Http\Resources\V1\Clients;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'business_name' => $this->business_name,
            'legal_name' => $this->legal_name,
            'document_type' => $this->document_type,
            'document_number' => $this->document_number,
            'client_type' => $this->client_type,
            'industry' => $this->industry,
            'company_size' => $this->company_size,
            'phone' => $this->phone,
            'email' => $this->email,
            'fiscal_address' => $this->fiscal_address,
            'website' => $this->website,
            'registration_date' => $this->registration_date?->format('Y-m-d'),
            'source' => $this->source,
            'category' => $this->category,
            'status' => $this->status,
            'area' => $this->whenLoaded('area', function () {
                return $this->area ? [
                    'id' => $this->area->id,
                    'name' => $this->area->name,
                ] : null;
            }),
            'assigned_user' => $this->whenLoaded('assignedUser', function () {
                return $this->assignedUser ? [
                    'id' => $this->assignedUser->id,
                    'name' => $this->assignedUser->name,
                    'email' => $this->assignedUser->email,
                ] : null;
            }),
            'assigned_to' => $this->whenLoaded('assignedUser', function () {
                return $this->assignedUser ? [
                    'id' => $this->assignedUser->id,
                    'name' => $this->assignedUser->name,
                    'email' => $this->assignedUser->email,
                ] : null;
            }),
            'tax_id' => $this->document_number,
            'full_name' => $this->client_type === 'individual' ? $this->legal_name : $this->business_name,
            'contacts' => ClientContactResource::collection($this->whenLoaded('contacts')),
            'services_count' => $this->whenLoaded('services', fn() => $this->services->count()),
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}

