<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'business_name',
        'legal_name',
        'document_type', // nit, ci, other
        'document_number',
        'client_type', // company, individual
        'industry',
        'company_size', // small, medium, large
        'phone',
        'email',
        'fiscal_address',
        'website',
        'registration_date',
        'source', // referred, marketing, direct_sale
        'category', // A, B, C
        'status', // active, inactive, prospect, lost
        'assigned_to',
        'area_id',
        'notes',
    ];

    protected $casts = [
        'registration_date' => 'date',
    ];

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(ClientContact::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }
}

