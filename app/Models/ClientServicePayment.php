<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientServicePayment extends Model
{
    protected $fillable = [
        'client_service_id',
        'payment_date',
        'amount',
        'payment_method',
        'invoice_number',
        'notes',
        'received_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function clientService(): BelongsTo
    {
        return $this->belongsTo(ClientService::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}


