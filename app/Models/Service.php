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
        'sla_response_time',
        'sla_availability',
        'sla_penalties',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'sla_response_time' => 'integer',
        'sla_availability' => 'decimal:2',
    ];

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

