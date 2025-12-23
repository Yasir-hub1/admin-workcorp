<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Area extends Model
{
    use SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'code',
        'description',
        'parent_id',
        'manager_id',
        'budget_monthly',
        'budget_annual',
        'email',
        'phone',
        'location',
        'is_active',
        'order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'budget_monthly' => 'decimal:2',
        'budget_annual' => 'decimal:2',
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

    /**
     * Get the parent area.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'parent_id');
    }

    /**
     * Get the child areas.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Area::class, 'parent_id');
    }

    /**
     * Get the manager (Jefe) of the area.
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Get all staff assigned to this area (via User).
     */
    public function staff(): HasMany
    {
        return $this->hasMany(User::class, 'area_id');
    }

    /**
     * Get all staff members assigned to this area (via Staff model).
     */
    public function staffMembers(): BelongsToMany
    {
        return $this->belongsToMany(Staff::class, 'area_staff')
            ->withPivot('is_manager', 'assigned_at', 'unassigned_at', 'assigned_by')
            ->withTimestamps();
    }

    /**
     * Get managers (jefes) of this area.
     */
    public function managers(): BelongsToMany
    {
        return $this->belongsToMany(Staff::class, 'area_staff')
            ->wherePivot('is_manager', true)
            ->wherePivotNull('unassigned_at')
            ->withPivot('assigned_at', 'assigned_by')
            ->withTimestamps();
    }

    /**
     * Scope a query to only include active areas.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include root areas (no parent).
     */
    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Get the full hierarchical path of the area.
     */
    public function getFullPathAttribute(): string
    {
        $path = [$this->name];
        $parent = $this->parent;

        while ($parent) {
            array_unshift($path, $parent->name);
            $parent = $parent->parent;
        }

        return implode(' > ', $path);
    }
}
