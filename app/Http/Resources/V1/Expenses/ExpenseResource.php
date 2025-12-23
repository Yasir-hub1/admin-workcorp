<?php

namespace App\Http\Resources\V1\Expenses;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'expense_date' => $this->expense_date->format('Y-m-d'),
            'category' => $this->category,
            'subcategory' => $this->subcategory,
            'area' => $this->whenLoaded('area', function () {
                return $this->area ? [
                    'id' => $this->area->id,
                    'name' => $this->area->name,
                ] : null;
            }),
            'cost_center' => $this->cost_center,
            'project_id' => $this->project_id,
            'document_number' => $this->document_number,
            'supplier_ruc_dni' => $this->supplier_ruc_dni,
            'supplier_name' => $this->supplier_name,
            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'payment_date' => $this->payment_date?->format('Y-m-d'),
            'payment_operation_number' => $this->payment_operation_number,
            'created_by' => $this->whenLoaded('createdBy', function () {
                return $this->createdBy ? [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ] : null;
            }),
            'requested_by' => $this->whenLoaded('createdBy', function () {
                return $this->createdBy ? [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ] : null;
            }),
            'paid_by' => $this->whenLoaded('paidByUser', function () {
                return $this->paidByUser ? [
                    'id' => $this->paidByUser->id,
                    'name' => $this->paidByUser->name,
                    'email' => $this->paidByUser->email,
                ] : null;
            }),
            'is_paid' => $this->status === 'paid',
            'currency' => 'PEN', // Por defecto, se puede hacer configurable
            'approvals' => ExpenseApprovalResource::collection($this->whenLoaded('approvals')),
            'attachments' => ExpenseAttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}

