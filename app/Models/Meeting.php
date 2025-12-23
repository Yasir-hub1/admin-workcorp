<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Meeting extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'start_time',
        'end_time',
        'location',
        'meeting_type',
        'organizer_id',
        'area_id',
        'attendees',
        'agenda',
        'notes',
        'attachments',
        'status',
        'meeting_link',
        'send_reminders',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'attendees' => 'array',
        'attachments' => 'array',
        'send_reminders' => 'boolean',
    ];

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class);
    }

    /**
     * Check if meeting is upcoming
     */
    public function isUpcoming(): bool
    {
        return $this->start_time > now() && $this->status === 'scheduled';
    }

    /**
     * Check if meeting is in progress
     */
    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }
}
