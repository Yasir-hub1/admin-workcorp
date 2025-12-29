<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Crypt;

class Note extends Model
{
    protected $fillable = [
        'title',
        'body_encrypted',
        'is_sensitive',
        'created_by',
    ];

    protected $casts = [
        'is_sensitive' => 'boolean',
    ];

    protected $appends = [
        'body',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'note_recipients')
            ->withTimestamps();
    }

    public function getBodyAttribute(): ?string
    {
        try {
            if (!$this->body_encrypted) return null;
            return Crypt::decryptString($this->body_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    public function setBodyAttribute(?string $value): void
    {
        $this->attributes['body_encrypted'] = $value === null ? null : Crypt::encryptString($value);
    }
}


