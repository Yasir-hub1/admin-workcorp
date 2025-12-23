<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attendance extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'date',
        'check_in',
        'check_out',
        'break_start',
        'break_end',
        'total_minutes',
        'overtime_minutes',
        'late_minutes',
        'is_absent',
        'is_late',
        'status',
        'notes',
        'check_in_location',
        'check_out_location',
        'check_in_ip',
        'check_out_ip',
    ];

    protected $casts = [
        'date' => 'date',
        'check_in' => 'datetime',
        'check_out' => 'datetime',
        'break_start' => 'datetime',
        'break_end' => 'datetime',
        'total_minutes' => 'integer',
        'overtime_minutes' => 'integer',
        'late_minutes' => 'integer',
        'is_absent' => 'boolean',
        'is_late' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación con AttendanceRecord (múltiples marcaciones)
     */
    public function records()
    {
        return $this->hasMany(AttendanceRecord::class)->orderBy('timestamp');
    }

    /**
     * Obtener todas las entradas del día
     */
    public function checkIns()
    {
        return $this->hasMany(AttendanceRecord::class)->where('type', 'check_in')->orderBy('timestamp');
    }

    /**
     * Obtener todas las salidas del día
     */
    public function checkOuts()
    {
        return $this->hasMany(AttendanceRecord::class)->where('type', 'check_out')->orderBy('timestamp');
    }

    /**
     * Obtener la última marcación
     */
    public function getLastRecordAttribute()
    {
        return $this->records()->latest('timestamp')->first();
    }

    /**
     * Obtener el tipo de la próxima marcación esperada
     * Si la última fue entrada, la próxima es salida, y viceversa
     */
    public function getNextMarkTypeAttribute(): string
    {
        $lastRecord = $this->lastRecord;
        
        if (!$lastRecord) {
            return 'check_in'; // Si no hay marcaciones, la primera es entrada
        }
        
        return $lastRecord->type === 'check_in' ? 'check_out' : 'check_in';
    }

    /**
     * Calcular tiempo total trabajado sumando TODOS los períodos entrada-salida
     * Lógica simplificada:
     * - Cada ENTRADA inicia un período de trabajo
     * - Cada SALIDA cierra el período y suma el tiempo desde la última entrada
     * - Suma TODOS los períodos entrada-salida sin excepciones
     * - Permite cualquier secuencia: entrada → entrada → salida → salida → entrada, etc.
     * - Si hay una entrada sin salida, no se cuenta (período en curso)
     */
    public function calculateTotalMinutes(): int
    {
        $records = $this->records()->orderBy('timestamp')->get();
        $totalMinutes = 0;
        $checkInTime = null;

        foreach ($records as $record) {
            if ($record->type === 'check_in') {
                // Si hay un período abierto, cerrarlo primero sumando el tiempo hasta esta nueva entrada
                if ($checkInTime) {
                    $totalMinutes += $checkInTime->diffInMinutes($record->timestamp);
                }
                // Iniciar nuevo período (nueva entrada)
                $checkInTime = $record->timestamp;
                
            } elseif ($record->type === 'check_out') {
                // Si hay una entrada pendiente, sumar el tiempo desde esa entrada hasta esta salida
                if ($checkInTime) {
                    $totalMinutes += $checkInTime->diffInMinutes($record->timestamp);
                    $checkInTime = null; // Cerrar el período
                }
                // Si no hay entrada pendiente, la salida no hace nada (puede pasar si se marca salida sin entrada previa)
            }
        }

        // Si queda un período abierto al final del día (entrada sin salida), no lo contamos
        // porque el día no ha terminado y el tiempo aún está en curso

        return $totalMinutes;
    }

    /**
     * Calculate total working hours
     */
    public function getTotalHoursAttribute(): float
    {
        $minutes = $this->total_minutes > 0 ? $this->total_minutes : $this->calculateTotalMinutes();
        return round($minutes / 60, 2);
    }

    /**
     * Calculate overtime hours
     */
    public function getOvertimeHoursAttribute(): float
    {
        return round($this->overtime_minutes / 60, 2);
    }
}
