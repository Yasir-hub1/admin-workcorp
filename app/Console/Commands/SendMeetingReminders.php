<?php

namespace App\Console\Commands;

use App\Models\Meeting;
use App\Models\Notification;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendMeetingReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'meetings:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Envía recordatorios de reuniones próximas (1 día antes, 1 hora antes, 15 minutos antes)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $now = Carbon::now();
        $totalReminders = 0;
        
        // Reuniones en 1 día (24 horas)
        $oneDayFromNow = $now->copy()->addDay();
        $meetingsOneDay = Meeting::where('status', 'scheduled')
            ->where('send_reminders', true)
            ->whereBetween('start_time', [
                $oneDayFromNow->copy()->subMinutes(10),
                $oneDayFromNow->copy()->addMinutes(10)
            ])
            ->get();

        foreach ($meetingsOneDay as $meeting) {
            if ($this->alreadySent($meeting->id, '1 día')) {
                continue;
            }
            $this->sendReminder($meeting, '1 día', 'high');
            $totalReminders++;
        }

        // Reuniones en 1 hora
        $oneHourFromNow = $now->copy()->addHour();
        $meetingsOneHour = Meeting::where('status', 'scheduled')
            ->where('send_reminders', true)
            ->whereBetween('start_time', [
                $oneHourFromNow->copy()->subMinutes(5),
                $oneHourFromNow->copy()->addMinutes(5)
            ])
            ->get();

        foreach ($meetingsOneHour as $meeting) {
            if ($this->alreadySent($meeting->id, '1 hora')) {
                continue;
            }
            $this->sendReminder($meeting, '1 hora', 'urgent');
            $totalReminders++;
        }

        // Reuniones en 15 minutos
        $fifteenMinutesFromNow = $now->copy()->addMinutes(15);
        $meetingsFifteen = Meeting::where('status', 'scheduled')
            ->where('send_reminders', true)
            ->whereBetween('start_time', [
                $fifteenMinutesFromNow->copy()->subMinutes(5),
                $fifteenMinutesFromNow->copy()->addMinutes(5)
            ])
            ->get();

        foreach ($meetingsFifteen as $meeting) {
            if ($this->alreadySent($meeting->id, '15 minutos')) {
                continue;
            }
            $this->sendReminder($meeting, '15 minutos', 'urgent');
            $totalReminders++;
        }
        
        if ($totalReminders > 0) {
            $this->info("Se enviaron {$totalReminders} recordatorios de reuniones.");
        }

        return 0;
    }

    /**
     * Envía recordatorio de reunión
     */
    private function sendReminder(Meeting $meeting, string $timeBefore, string $priority): void
    {
        $startTime = Carbon::parse($meeting->start_time);
        $formattedDate = $startTime->format('d/m/Y H:i');
        
        $message = "Recordatorio: La reunión '{$meeting->title}' está programada en {$timeBefore} ({$formattedDate})";
        if ($meeting->location) {
            $message .= " en {$meeting->location}";
        }
        if ($meeting->meeting_link) {
            $message .= ". Enlace: {$meeting->meeting_link}";
        }

        $attendees = $meeting->attendees ?? [];
        
        // Agregar organizador si no está en la lista
        if (!in_array($meeting->organizer_id, $attendees)) {
            $attendees[] = $meeting->organizer_id;
        }

        if (!empty($attendees)) {
            NotificationService::notifyMany(
                $attendees,
                'meeting',
                "Recordatorio: {$meeting->title}",
                $message,
                "/meetings/{$meeting->id}",
                $priority,
                [
                    'meeting_id' => $meeting->id,
                    'reminder_time' => $timeBefore,
                ]
            );
            NotificationService::sendPushNotifications(
                $attendees,
                "Recordatorio: {$meeting->title}",
                $message,
                "/meetings/{$meeting->id}",
                [
                    'meeting_id' => $meeting->id,
                    'reminder_time' => $timeBefore,
                    'url' => "/meetings/{$meeting->id}",
                ]
            );

            // Admin también recibe recordatorio (vista global)
            NotificationService::notifySuperAdmins(
                'meeting',
                "Recordatorio: {$meeting->title}",
                $message,
                "/meetings/{$meeting->id}",
                $priority,
                [
                    'meeting_id' => $meeting->id,
                    'reminder_time' => $timeBefore,
                ]
            );
        }
    }

    private function alreadySent(int $meetingId, string $timeBefore): bool
    {
        // Evitar duplicados cuando el scheduler corre cada 5 min y la ventana es +/-5..10 min
        return Notification::query()
            ->where('type', 'meeting')
            ->where('data->meeting_id', $meetingId)
            ->where('data->reminder_time', $timeBefore)
            ->where('created_at', '>=', now()->subMinutes(25))
            ->exists();
    }
}
