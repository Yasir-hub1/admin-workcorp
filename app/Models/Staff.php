<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Staff extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'employee_number',
        'first_name',
        'last_name',
        'document_type',
        'document_number',
        'birth_date',
        'gender',
        'nationality',
        'phone',
        'mobile',
        'emergency_contact_name',
        'emergency_contact_phone',
        'address',
        'city',
        'state',
        'postal_code',
        'country',
        'hire_date',
        'contract_start_date',
        'contract_end_date',
        'contract_type',
        'position',
        'area_id',
        'job_description',
        'latitude',
        'longitude',
        'location_updated_at',
        'is_active',
        'termination_date',
        'termination_reason',
        'notes',
        'custom_fields',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'hire_date' => 'date',
        'contract_start_date' => 'date',
        'contract_end_date' => 'date',
        'termination_date' => 'date',
        'location_updated_at' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'is_active' => 'boolean',
        'custom_fields' => 'array',
    ];

    /**
     * Get the user associated with this staff member.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the area where this staff member works.
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * Get all areas where this staff member is assigned (including as manager).
     */
    public function areas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'area_staff')
            ->withPivot('is_manager', 'assigned_at', 'unassigned_at', 'assigned_by')
            ->withTimestamps();
    }

    /**
     * Get areas where this staff member is a manager.
     */
    public function managedAreas(): BelongsToMany
    {
        return $this->belongsToMany(Area::class, 'area_staff')
            ->wherePivot('is_manager', true)
            ->withPivot('assigned_at', 'unassigned_at', 'assigned_by')
            ->withTimestamps();
    }

    /**
     * Get all salary records for this staff member.
     */
    public function salaries(): HasMany
    {
        return $this->hasMany(StaffSalary::class)->orderBy('effective_date', 'desc');
    }

    /**
     * Get the current active salary.
     */
    public function currentSalary(): BelongsTo
    {
        return $this->belongsTo(StaffSalary::class, 'id', 'staff_id')
            ->where('is_active', true)
            ->latest('effective_date');
    }

    /**
     * Get the latest salary (may not be active).
     */
    public function latestSalary()
    {
        return $this->hasOne(StaffSalary::class)->latestOfMany('effective_date');
    }

    /**
     * Scope a query to only include active staff.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include inactive staff.
     */
    public function scopeInactive($query)
    {
        return $query->where('is_active', false);
    }

    /**
     * Get full name from staff or user.
     */
    public function getFullNameAttribute(): string
    {
        if ($this->first_name || $this->last_name) {
            return trim(($this->first_name ?? '') . ' ' . ($this->last_name ?? ''));
        }
        return $this->user?->name ?? '';
    }

    /**
     * Get email from user.
     */
    public function getEmailAttribute(): string
    {
        return $this->user?->email ?? '';
    }
}
