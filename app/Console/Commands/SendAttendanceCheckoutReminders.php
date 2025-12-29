<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendAttendanceCheckoutReminders extends Command
{
    protected $signature = 'attendance:send-checkout-reminders';

    protected $description = 'Envía recordatorios de salida (check-out) cuando hay entrada sin salida por muchas horas';

    public function handle(): int
    {
        $now = now();
        $today = $now->toDateString();
        $total = 0;

        // Asistencias del día con marcaciones
        $attendances = Attendance::query()
            ->whereDate('date', $today)
            ->with(['user', 'records'])
            ->get();

        foreach ($attendances as $attendance) {
            $user = $attendance->user;
            if (!$user || !$user->is_active) continue;

            $last = $attendance->lastRecord;
            if (!$last) continue;

            // Si la última marcación fue entrada y han pasado >= 9h, recordamos que marque salida.
            if ($last->type !== 'check_in') continue;
            if ($last->timestamp && $last->timestamp->diffInMinutes($now) < 9 * 60) continue;

            if ($this->alreadySent((int) $attendance->id, (int) $user->id, 'missing_checkout')) {
                continue;
            }

            $title = 'Recordatorio: marcar salida';
            $message = "Parece que tienes una entrada registrada sin salida.\n"
                . "Fecha: {$today}\n"
                . "Última entrada: " . ($last->timestamp?->format('d/m/Y H:i') ?? '-')
                . "\nPor favor marca tu salida si ya terminaste tu jornada.";

            $actionUrl = '/attendance';
            $data = [
                'attendance_id' => $attendance->id,
                'record_id' => $last->id,
                'reminder' => 'missing_checkout',
            ];

            NotificationService::notifyMany([(int) $user->id], 'attendance', $title, $message, $actionUrl, 'normal', $data);
            NotificationService::sendPushNotifications([(int) $user->id], $title, $message, $actionUrl, $data);
            $total++;
        }

        if ($total > 0) {
            $this->info("Se enviaron {$total} recordatorios de salida.");
        }

        return 0;
    }

    private function alreadySent(int $attendanceId, int $userId, string $reminderKey): bool
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('type', 'attendance')
            ->where('data->attendance_id', $attendanceId)
            ->where('data->reminder', $reminderKey)
            ->where('created_at', '>=', now()->subHours(6))
            ->exists();
    }
}


