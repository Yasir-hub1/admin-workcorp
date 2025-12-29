<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Service extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'description',
        'category',
        'price',
        'billing_type', // monthly, annual, project, hourly
        'standard_duration',
        'client_id',
        'start_date',
        'end_date',
        'contract_duration_months',
        'contract_amount',
        'payment_frequency',
        'status',
        'auto_renewal',
        'billing_day',
        'assigned_to',
        'area_id',
        'sla_response_time',
        'sla_availability',
        'sla_penalties',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
        'contract_amount' => 'decimal:2',
        'auto_renewal' => 'boolean',
        'billing_day' => 'integer',
        'sla_response_time' => 'integer',
        'sla_availability' => 'decimal:2',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function renewals(): HasMany
    {
        return $this->hasMany(ServiceRenewal::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(ServiceIncident::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ServicePayment::class);
    }
}

