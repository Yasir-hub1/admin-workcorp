<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceRecord extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'attendance_id',
        'type', // 'check_in' o 'check_out'
        'mark_reason', // Razón específica de la marcación (entrada_principal, salida_almorzar, etc.)
        'timestamp',
        'location',
        'ip_address',
        'notes',
    ];

    protected $casts = [
        'timestamp' => 'datetime',
    ];

    /**
     * Relación con Attendance
     */
    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    /**
     * Scope para filtrar por tipo
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope para entradas
     */
    public function scopeCheckIns($query)
    {
        return $query->where('type', 'check_in');
    }

    /**
     * Scope para salidas
     */
    public function scopeCheckOuts($query)
    {
        return $query->where('type', 'check_out');
    }
}
