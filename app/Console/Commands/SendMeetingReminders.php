<?php

namespace App\Console\Commands;

use App\Models\Meeting;
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
            $this->sendReminder($meeting, '1 día', 'alta');
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
            $this->sendReminder($meeting, '1 hora', 'urgente');
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
            $this->sendReminder($meeting, '15 minutos', 'urgente');
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
        }
    }
}
