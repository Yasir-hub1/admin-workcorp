<?php

namespace App\Http\Resources\V1\Tickets;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category,
            'priority' => $this->priority,
            'status' => $this->status,
            'created_by_id' => $this->created_by,
            'assigned_to_id' => $this->assigned_to,
            'client_id' => $this->client_id,
            'area_id' => $this->area_id,
            'attachments' => $this->attachments ?? [],
            'sla_hours' => $this->sla_hours,
            'sla_due_at' => $this->sla_due_at?->toISOString(),
            'resolved_at' => $this->resolved_at?->toISOString(),
            'resolved_by_id' => $this->resolved_by,
            'resolution_notes' => $this->resolution_notes,
            'satisfaction_rating' => $this->satisfaction_rating,
            'satisfaction_feedback' => $this->satisfaction_feedback,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Relationships
            'created_by' => $this->whenLoaded('createdBy', function () {
                return $this->createdBy ? [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ] : null;
            }),
            'assigned_to' => $this->whenLoaded('assignedTo', function () {
                return $this->assignedTo ? [
                    'id' => $this->assignedTo->id,
                    'name' => $this->assignedTo->name,
                    'email' => $this->assignedTo->email,
                ] : null;
            }),
            'client' => $this->whenLoaded('client', function () {
                return $this->client ? [
                    'id' => $this->client->id,
                    'business_name' => $this->client->business_name,
                    'legal_name' => $this->client->legal_name,
                    'document_number' => $this->client->document_number,
                ] : null;
            }),
            'resolved_by' => $this->whenLoaded('resolvedBy', function () {
                return $this->resolvedBy ? [
                    'id' => $this->resolvedBy->id,
                    'name' => $this->resolvedBy->name,
                    'email' => $this->resolvedBy->email,
                ] : null;
            }),
            'area' => $this->whenLoaded('area', function () {
                return $this->area ? [
                    'id' => $this->area->id,
                    'name' => $this->area->name,
                ] : null;
            }),
        ];
    }
}

