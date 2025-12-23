<?php

namespace App\Http\Resources\V1\Expenses;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpenseApprovalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'expense_id' => $this->expense_id,
            'status' => $this->status,
            'comments' => $this->comments,
            'approved_by' => $this->whenLoaded('approvedBy', fn() => [
                'id' => $this->approvedBy->id,
                'name' => $this->approvedBy->name,
            ]),
            'approved_at' => $this->approved_at->toDateTimeString(),
            'created_at' => $this->created_at?->toDateTimeString(),
        ];
    }
}

