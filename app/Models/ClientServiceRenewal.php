<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientServiceRenewal extends Model
{
    protected $fillable = [
        'client_service_id',
        'renewal_date',
        'previous_end_date',
        'new_end_date',
        'renewal_amount',
        'renewed_by',
        'notes',
    ];

    protected $casts = [
        'renewal_date' => 'date',
        'previous_end_date' => 'date',
        'new_end_date' => 'date',
        'renewal_amount' => 'decimal:2',
    ];

    public function clientService(): BelongsTo
    {
        return $this->belongsTo(ClientService::class);
    }

    public function renewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'renewed_by');
    }
}


