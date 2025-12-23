<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'sku',
        'category',
        'brand',
        'model',
        'description',
        'purchase_cost',
        'purchase_date',
        'supplier',
        'sale_price',
        'currency',
        'current_stock',
        'min_stock',
        'max_stock',
        'unit_of_measure',
        'location',
        'warehouse',
    ];

    protected $casts = [
        'purchase_cost' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'purchase_date' => 'date',
        'current_stock' => 'integer',
        'min_stock' => 'integer',
        'max_stock' => 'integer',
    ];

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function isLowStock(): bool
    {
        return $this->current_stock <= $this->min_stock;
    }

    public function getTotalValueAttribute(): float
    {
        return $this->current_stock * $this->purchase_cost;
    }
}

