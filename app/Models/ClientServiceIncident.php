<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientServiceIncident extends Model
{
    protected $fillable = [
        'client_service_id',
        'reported_by',
        'incident_date',
        'description',
        'severity',
        'status',
        'resolution',
        'resolved_at',
        'resolved_by',
    ];

    protected $casts = [
        'incident_date' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function clientService(): BelongsTo
    {
        return $this->belongsTo(ClientService::class);
    }

    public function reportedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}


