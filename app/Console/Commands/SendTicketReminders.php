<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Ticket;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendTicketReminders extends Command
{
    protected $signature = 'tickets:send-reminders';

    protected $description = 'Envía recordatorios de tickets pendientes (por SLA próximo o vencido)';

    public function handle(): int
    {
        $now = now();
        $total = 0;

        // Tickets vencidos (SLA pasado) o por vencer en 60 min
        $tickets = Ticket::query()
            ->whereNotNull('assigned_to')
            ->whereIn('status', ['open', 'assigned', 'in_progress'])
            ->whereNotNull('sla_due_at')
            ->where('sla_due_at', '<=', $now->copy()->addMinutes(60))
            ->with(['client', 'assignedTo'])
            ->orderBy('sla_due_at')
            ->limit(200)
            ->get();

        foreach ($tickets as $ticket) {
            $assignedId = (int) $ticket->assigned_to;
            if (!$assignedId) continue;

            $isOverdue = $ticket->sla_due_at && $ticket->sla_due_at->lt($now);
            $reminderKey = $isOverdue ? 'sla_overdue' : 'sla_due_soon';

            if ($this->alreadySent((int) $ticket->id, $assignedId, $reminderKey)) {
                continue;
            }

            $clientName = $ticket->client?->business_name ?? $ticket->client?->legal_name ?? 'Cliente';
            $due = $ticket->sla_due_at?->format('d/m/Y H:i') ?? '-';
            $title = $isOverdue ? "Ticket vencido: {$ticket->ticket_number}" : "Ticket por vencer: {$ticket->ticket_number}";
            $message = ($isOverdue ? "SLA vencido.\n" : "SLA por vencer.\n")
                . "Cliente: {$clientName}\n"
                . "Título: {$ticket->title}\n"
                . "Prioridad: {$ticket->priority}\n"
                . "Vence: {$due}";

            $actionUrl = "/tickets/{$ticket->id}";
            $data = [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'client_id' => $ticket->client_id,
                'assigned_to' => $assignedId,
                'status' => $ticket->status,
                'priority' => $ticket->priority,
                'reminder' => $reminderKey,
                'url' => $actionUrl,
            ];

            // Soporte asignado
            NotificationService::notifyMany([$assignedId], 'ticket', $title, $message, $actionUrl, $isOverdue ? 'urgent' : 'high', $data);
            NotificationService::sendPushNotifications([$assignedId], $title, $message, $actionUrl, $data);

            // Admin (vista global)
            NotificationService::notifySuperAdmins('ticket', $title, $message, $actionUrl, $isOverdue ? 'urgent' : 'high', $data);

            $total++;
        }

        if ($total > 0) {
            $this->info("Se enviaron {$total} recordatorios de tickets.");
        }

        return 0;
    }

    private function alreadySent(int $ticketId, int $userId, string $reminderKey): bool
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('type', 'ticket')
            ->where('data->ticket_id', $ticketId)
            ->where('data->reminder', $reminderKey)
            ->where('created_at', '>=', now()->subMinutes(55))
            ->exists();
    }
}


