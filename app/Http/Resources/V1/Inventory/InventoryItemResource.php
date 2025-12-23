<?php

namespace App\Http\Resources\V1\Inventory;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'sku' => $this->sku,
            'category' => $this->category,
            'brand' => $this->brand,
            'model' => $this->model,
            'description' => $this->description,
            'purchase_cost' => (float) $this->purchase_cost,
            'purchase_date' => $this->purchase_date?->format('Y-m-d'),
            'supplier' => $this->supplier,
            'sale_price' => $this->sale_price ? (float) $this->sale_price : null,
            'currency' => $this->currency,
            'current_stock' => $this->current_stock,
            'min_stock' => $this->min_stock,
            'max_stock' => $this->max_stock,
            'is_low_stock' => $this->isLowStock(),
            'unit_of_measure' => $this->unit_of_measure,
            'location' => $this->location,
            'warehouse' => $this->warehouse,
            'total_value' => (float) $this->getTotalValueAttribute(),
            'movements_count' => $this->whenLoaded('movements', fn() => $this->movements->count()),
            'created_at' => $this->created_at?->toDateTimeString(),
            'updated_at' => $this->updated_at?->toDateTimeString(),
        ];
    }
}

