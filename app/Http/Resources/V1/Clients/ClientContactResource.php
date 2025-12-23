<?php

namespace App\Http\Resources\V1\Clients;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientContactResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'client_id' => $this->client_id,
            'name' => $this->name,
            'position' => $this->position,
            'phone' => $this->phone,
            'email' => $this->email,
            'is_primary' => $this->is_primary,
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}

