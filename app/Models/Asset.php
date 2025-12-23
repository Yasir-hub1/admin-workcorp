<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Asset extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'serial_number',
        'category',
        'brand',
        'model',
        'description',
        'acquisition_cost',
        'purchase_date',
        'supplier',
        'invoice_number',
        'purchase_order',
        'payment_method',
        'current_value',
        'useful_life_years',
        'status', // available, in_use, maintenance, repair, decommissioned
        'area_id',
        'location',
        'assigned_to',
        'warranty_start_date',
        'warranty_end_date',
        'warranty_terms',
    ];

    protected $casts = [
        'acquisition_cost' => 'decimal:2',
        'current_value' => 'decimal:2',
        'purchase_date' => 'date',
        'warranty_start_date' => 'date',
        'warranty_end_date' => 'date',
        'useful_life_years' => 'integer',
    ];

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(AssetMaintenance::class);
    }

    public function calculateDepreciation(): float
    {
        if (!$this->purchase_date || !$this->useful_life_years) {
            return 0;
        }

        $yearsSincePurchase = now()->diffInYears($this->purchase_date);
        $depreciationRate = $yearsSincePurchase / $this->useful_life_years;
        
        return min($depreciationRate, 1) * $this->acquisition_cost;
    }

    public function getCurrentValueAttribute($value): float
    {
        if ($value !== null) {
            return (float) $value;
        }

        return max(0, $this->acquisition_cost - $this->calculateDepreciation());
    }
}

