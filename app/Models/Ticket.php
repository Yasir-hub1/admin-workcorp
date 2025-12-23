<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ticket extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'ticket_number',
        'title',
        'description',
        'category',
        'priority',
        'status',
        'created_by',
        'assigned_to',
        'client_id',
        'area_id',
        'attachments',
        'sla_hours',
        'sla_due_at',
        'resolved_at',
        'resolved_by',
        'resolution_notes',
        'satisfaction_rating',
        'satisfaction_feedback',
    ];

    protected $casts = [
        'attachments' => 'array',
        'sla_hours' => 'integer',
        'sla_due_at' => 'datetime',
        'resolved_at' => 'datetime',
        'satisfaction_rating' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ticket) {
            if (empty($ticket->ticket_number)) {
                $ticket->ticket_number = 'TKT-' . strtoupper(uniqid());
            }
        });
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * Check if ticket is open
     */
    public function isOpen(): bool
    {
        return in_array($this->status, ['open', 'assigned', 'in_progress']);
    }

    /**
     * Check if SLA is overdue
     */
    public function isSlaOverdue(): bool
    {
        return $this->sla_due_at && $this->sla_due_at < now() && $this->isOpen();
    }
}
