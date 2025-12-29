<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientService extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'client_id',
        'service_id',
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
        'created_by',
        'notes',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'contract_amount' => 'decimal:2',
        'auto_renewal' => 'boolean',
        'billing_day' => 'integer',
        'contract_duration_months' => 'integer',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ClientServicePayment::class);
    }

    public function renewals(): HasMany
    {
        return $this->hasMany(ClientServiceRenewal::class);
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(ClientServiceIncident::class);
    }
}


