<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Request as RequestModel;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendRequestReminders extends Command
{
    protected $signature = 'requests:send-reminders';

    protected $description = 'Envía recordatorios de solicitudes pendientes a jefes de área y admins (según área)';

    public function handle(): int
    {
        $now = now();
        $total = 0;

        // Pendientes con más de 24h
        $requests = RequestModel::query()
            ->where('status', 'pending')
            ->whereNotNull('area_id')
            ->where('created_at', '<=', $now->copy()->subHours(24))
            ->with(['user'])
            ->orderBy('created_at')
            ->limit(200)
            ->get();

        foreach ($requests as $req) {
            $areaId = (int) $req->area_id;
            if (!$areaId) continue;

            if ($this->alreadySent((int) $req->id, 'pending_over_24h')) {
                continue;
            }

            $staffName = $req->user?->name ?? 'Personal';
            $title = 'Solicitud pendiente por aprobar';
            $message = "Hay una solicitud pendiente hace más de 24 horas.\n"
                . "Personal: {$staffName}\n"
                . "Título: {$req->title}\n"
                . "Tipo: {$req->type}\n"
                . "Registrada: " . ($req->created_at?->format('d/m/Y H:i') ?? '-');

            $actionUrl = "/requests/{$req->id}";
            $data = [
                'request_id' => $req->id,
                'area_id' => $areaId,
                'status' => $req->status,
                'type' => $req->type,
                'reminder' => 'pending_over_24h',
            ];

            // Respeta visibilidad: jefes solo su área, admin todo.
            NotificationService::notifyAreaManagersAndAdmins(
                $areaId,
                'requests',
                $title,
                $message,
                $actionUrl,
                'high',
                $data
            );

            $total++;
        }

        if ($total > 0) {
            $this->info("Se enviaron {$total} recordatorios de solicitudes.");
        }

        return 0;
    }

    private function alreadySent(int $requestId, string $reminderKey): bool
    {
        return Notification::query()
            ->where('type', 'requests')
            ->where('data->request_id', $requestId)
            ->where('data->reminder', $reminderKey)
            ->where('created_at', '>=', now()->subHours(23))
            ->exists();
    }
}


