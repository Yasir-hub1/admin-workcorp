<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportDutyAssignment extends Model
{
    protected $fillable = [
        'duty_date',
        'user_id',
        'color',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'duty_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}


