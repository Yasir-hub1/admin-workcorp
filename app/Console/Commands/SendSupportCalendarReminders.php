<?php

namespace App\Console\Commands;

use App\Models\SupportDutyAssignment;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendSupportCalendarReminders extends Command
{
    protected $signature = 'support-calendar:send-reminders {--date=}';

    protected $description = 'Envía recordatorios al personal asignado para soporte de sábado (1 día antes).';

    public function handle(): int
    {
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->startOfDay()
            : now()->startOfDay();

        $target = $date->copy()->addDay(); // mañana

        $assignments = SupportDutyAssignment::query()
            ->with('user:id,name,email')
            ->whereDate('duty_date', $target->toDateString())
            ->get();

        if ($assignments->isEmpty()) {
            $this->info('No hay turnos para mañana.');
            return self::SUCCESS;
        }

        foreach ($assignments as $a) {
            if (!$a->user_id) continue;

            $title = 'Recordatorio: soporte mañana';
            $message = "Mañana ({$target->toDateString()}) te toca soporte (sábado). Revisa el calendario para detalles.";

            // No hay página dedicada aún; el modal está en el topbar, así que mandamos al dashboard.
            $actionUrl = '/dashboard';

            try {
                NotificationService::notifyMany(
                    [$a->user_id],
                    'support_calendar',
                    $title,
                    $message,
                    $actionUrl,
                    'high',
                    ['duty_date' => $target->toDateString()]
                );
                NotificationService::sendPushNotifications(
                    [$a->user_id],
                    $title,
                    $message,
                    $actionUrl,
                    ['duty_date' => $target->toDateString()]
                );
            } catch (\Throwable $e) {
                $this->error("Error enviando recordatorio a user_id={$a->user_id}: {$e->getMessage()}");
            }

            // Admin siempre enterado
            try {
                NotificationService::notifySuperAdmins(
                    'support_calendar',
                    'Turno de soporte (mañana)',
                    "{$a->user?->name} tiene soporte mañana ({$target->toDateString()}).",
                    $actionUrl,
                    'normal',
                    ['duty_date' => $target->toDateString(), 'user_id' => $a->user_id]
                );
            } catch (\Throwable $e) {
                // no romper el comando
            }
        }

        $this->info("Recordatorios enviados: {$assignments->count()}");
        return self::SUCCESS;
    }
}


