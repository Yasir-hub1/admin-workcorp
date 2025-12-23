<?php

namespace App\Http\Controllers\Api\V1\Attendance;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceRecord;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class AttendanceController extends Controller
{
    /**
     * Display a listing of attendances.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Attendance::with(['user', 'records']);

        // Filtros
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('date')) {
            $query->whereDate('date', $request->date);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Paginación
        $perPage = $request->get('per_page', 15);
        $attendances = $query->latest('date')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $attendances->items(),
            'meta' => [
                'current_page' => $attendances->currentPage(),
                'last_page' => $attendances->lastPage(),
                'per_page' => $attendances->perPage(),
                'total' => $attendances->total(),
            ],
        ]);
    }

    /**
     * Marcar asistencia (entrada o salida).
     * El sistema determina automáticamente si es entrada o salida basándose en la última marcación.
     */
    public function mark(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:check_in,check_out', // Requerido: el usuario elige entrada o salida
            'mark_reason' => 'nullable|string|max:255', // Opcional: solo para referencia
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $today = now()->toDateString();

        DB::beginTransaction();
        try {
            // Obtener o crear asistencia del día
            $attendance = Attendance::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'date' => $today,
                ],
                [
                    'status' => 'pending',
                ]
            );

            // El tipo viene directamente del request (sin validaciones restrictivas)
            // Permite cualquier secuencia: entrada → entrada → salida → salida → entrada, etc.
            $type = $request->input('type');

            // Crear el registro de marcación
            // mark_reason es opcional, si no viene se usa el tipo como referencia
            $record = AttendanceRecord::create([
                'attendance_id' => $attendance->id,
                'type' => $type,
                'mark_reason' => $request->input('mark_reason') ?: $type, // Si no viene, usar el tipo
                'timestamp' => now(),
                'location' => $request->input('location'),
                'ip_address' => $request->ip(),
                'notes' => $request->input('notes'),
            ]);

            // Recalcular tiempo total trabajado
            $totalMinutes = $attendance->calculateTotalMinutes();
            
            // Calcular horas extras (asumiendo 8 horas = 480 minutos)
            $standardMinutes = 480;
            $overtimeMinutes = max(0, $totalMinutes - $standardMinutes);

            // Actualizar asistencia
            $attendance->update([
                'total_minutes' => $totalMinutes,
                'overtime_minutes' => $overtimeMinutes,
                'status' => $this->determineStatus($attendance),
            ]);

            DB::commit();

            // Recargar relaciones
            $attendance->load(['user.staff', 'records']);

            // Enviar notificaciones a jefes de área y super admins
            try {
                $this->sendAttendanceNotification($user, $type, $record);
            } catch (\Throwable $e) {
                // No romper la marcación por fallos de notificaciones/push
                \Log::error('Attendance mark: notification failed', [
                    'user_id' => $user->id,
                    'type' => $type,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => $this->getTypeLabel($type) . ' registrada correctamente',
                'data' => [
                    'attendance' => $attendance,
                    'record' => $record,
                    'next_mark_type' => $attendance->next_mark_type,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar la marcación: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Check in (marcar entrada) - Método legacy para compatibilidad.
     * @deprecated Usar mark() en su lugar
     */
    public function checkIn(Request $request): JsonResponse
    {
        $request->merge(['type' => 'check_in']);
        return $this->mark($request);
    }

    /**
     * Check out (marcar salida) - Método legacy para compatibilidad.
     * @deprecated Usar mark() en su lugar
     */
    public function checkOut(Request $request): JsonResponse
    {
        $request->merge(['type' => 'check_out']);
        return $this->mark($request);
    }

    /**
     * Get current user's today attendance with all records.
     */
    public function today(): JsonResponse
    {
        $user = Auth::user();
        $today = now()->toDateString();

        $attendance = Attendance::with(['user', 'records'])
            ->where('user_id', $user->id)
            ->whereDate('date', $today)
            ->first();

        if (!$attendance) {
            return response()->json([
                'success' => true,
                'data' => null,
                'next_mark_type' => 'check_in',
            ]);
        }

        // Recalcular tiempo total si es necesario
        if ($attendance->total_minutes === 0 && $attendance->records->count() > 0) {
            $totalMinutes = $attendance->calculateTotalMinutes();
            $attendance->update(['total_minutes' => $totalMinutes]);
            $attendance->refresh();
        }

        return response()->json([
            'success' => true,
            'data' => $attendance,
            'next_mark_type' => $attendance->next_mark_type,
        ]);
    }

    /**
     * Get statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $userId = $request->get('user_id', Auth::id());
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfMonth());

        $stats = Attendance::where('user_id', $userId)
            ->whereBetween('date', [$startDate, $endDate])
            ->selectRaw('
                COUNT(*) as total_days,
                SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_days,
                SUM(CASE WHEN is_absent = 1 THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN is_late = 1 THEN 1 ELSE 0 END) as late_days,
                SUM(total_minutes) as total_minutes,
                SUM(overtime_minutes) as total_overtime_minutes,
                SUM(late_minutes) as total_late_minutes
            ')
            ->first();

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Display the specified attendance.
     */
    public function show(Attendance $attendance): JsonResponse
    {
        $attendance->load(['user', 'records']);
        return response()->json([
            'success' => true,
            'data' => $attendance,
        ]);
    }

    /**
     * Update the specified attendance (admin only).
     */
    public function update(Request $request, Attendance $attendance): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'nullable|in:pending,completed,absent,late',
            'notes' => 'nullable|string',
        ]);

        $attendance->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Asistencia actualizada correctamente',
            'data' => $attendance->load(['user', 'records']),
        ]);
    }

    /**
     * Delete an attendance record (admin only).
     */
    public function deleteRecord(AttendanceRecord $record): JsonResponse
    {
        $attendance = $record->attendance;
        
        DB::beginTransaction();
        try {
            $record->delete();

            // Recalcular tiempo total
            $totalMinutes = $attendance->calculateTotalMinutes();
            $standardMinutes = 480;
            $overtimeMinutes = max(0, $totalMinutes - $standardMinutes);

            $attendance->update([
                'total_minutes' => $totalMinutes,
                'overtime_minutes' => $overtimeMinutes,
                'status' => $this->determineStatus($attendance),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Registro eliminado correctamente',
                'data' => $attendance->load(['user', 'records']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el registro: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper: Obtener etiqueta del tipo de marcación
     */
    private function getTypeLabel(string $type): string
    {
        return $type === 'check_in' ? 'Entrada' : 'Salida';
    }

    /**
     * Helper: Determinar el estado de la asistencia
     */
    private function determineStatus(Attendance $attendance): string
    {
        $records = $attendance->records;
        
        if ($records->isEmpty()) {
            return 'pending';
        }

        $lastRecord = $records->sortByDesc('timestamp')->first();
        
        // Si la última marcación es entrada, está pendiente
        if ($lastRecord->type === 'check_in') {
            return 'pending';
        }

        // Si hay al menos una entrada y una salida, está completada
        $hasCheckIn = $records->where('type', 'check_in')->isNotEmpty();
        $hasCheckOut = $records->where('type', 'check_out')->isNotEmpty();
        
        if ($hasCheckIn && $hasCheckOut) {
            return 'completed';
        }

        return 'pending';
    }

    /**
     * Send notification to managers and admins when attendance is marked.
     */
    private function sendAttendanceNotification(User $user, string $type, AttendanceRecord $record): void
    {
        // Obtener nombre del personal
        $staffName = $user->staff
            ? trim(($user->staff->first_name ?? '') . ' ' . ($user->staff->last_name ?? ''))
            : $user->name;

        if (empty($staffName)) {
            $staffName = $user->email;
        }

        // Formatear fecha y hora
        $dateTime = $record->timestamp->format('d/m/Y H:i:s');
        $typeLabel = $this->getTypeLabel($type);

        // Construir mensaje
        $message = sprintf(
            "%s marcó %s\nFecha: %s\nUbicación: %s",
            $staffName,
            $typeLabel,
            $dateTime,
            $record->location ?? 'No especificada'
        );

        if ($record->notes) {
            $message .= "\nNotas: " . $record->notes;
        }

        // Crear título
        $title = sprintf('%s - %s', $typeLabel, $staffName);

        // URL de acción (ir a la página de asistencias)
        $actionUrl = '/attendance';

        // Datos adicionales
        $data = [
            'attendance_id' => $record->attendance_id,
            'record_id' => $record->id,
            'user_id' => $user->id,
            'staff_name' => $staffName,
            'type' => $type,
            'timestamp' => $record->timestamp->toISOString(),
            'location' => $record->location,
            'notes' => $record->notes,
        ];

        // Enviar notificaciones a jefes de área y super admins
        NotificationService::notifyManagersAndAdmins(
            'attendance',
            $title,
            $message,
            $actionUrl,
            'normal',
            $data
        );
    }
}
