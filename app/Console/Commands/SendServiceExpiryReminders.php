<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\ClientService;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendServiceExpiryReminders extends Command
{
    protected $signature = 'services:send-expiry-reminders {--days=7,1}';

    protected $description = 'Envía recordatorios de vencimiento de servicios (DB + Push) a responsables y admins';

    public function handle(): int
    {
        $daysRaw = (string) $this->option('days');
        $daysList = collect(explode(',', $daysRaw))
            ->map(fn ($v) => (int) trim($v))
            ->filter(fn ($v) => $v >= 0 && $v <= 90)
            ->unique()
            ->values()
            ->all();

        if (empty($daysList)) {
            $daysList = [7, 1];
        }

        $today = now()->startOfDay();
        $total = 0;

        foreach ($daysList as $daysBefore) {
            $targetDate = $today->copy()->addDays($daysBefore);

            $clientServices = ClientService::query()
                ->whereNotNull('end_date')
                ->whereDate('end_date', '=', $targetDate->toDateString())
                ->whereNull('deleted_at')
                ->with(['client', 'assignedUser', 'service'])
                ->orderBy('end_date')
                ->limit(300)
                ->get();

            foreach ($clientServices as $cs) {
                if (!$cs->client_id) continue;

                $recipientIds = [];

                // Responsable del servicio (si existe)
                if ($cs->assigned_to) {
                    $recipientIds[] = (int) $cs->assigned_to;
                }

                // Ejecutivo asignado al cliente (si existe)
                if ($cs->client?->assigned_to) {
                    $recipientIds[] = (int) $cs->client->assigned_to;
                }

                $recipientIds = collect($recipientIds)->filter()->unique()->values()->all();

                // Filtrar recipients por permiso (excepto super_admin, que siempre)
                $recipientIds = User::query()
                    ->whereIn('id', $recipientIds)
                    ->where('is_active', true)
                    ->get(['id'])
                    ->pluck('id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                $clientName = $cs->client?->business_name
                    ?? $cs->client?->legal_name
                    ?? $cs->client?->full_name
                    ?? 'Cliente';

                $svcName = $cs->service?->name ?? 'Servicio';
                $end = $cs->end_date?->format('d/m/Y') ?? '-';
                $title = $daysBefore === 0
                    ? "Servicio vencido hoy: {$svcName}"
                    : "Servicio por vencer en {$daysBefore} día(s): {$svcName}";
                $message = "Cliente: {$clientName}\n"
                    . "Servicio: {$svcName}\n"
                    . "Vence: {$end}";

                $actionUrl = "/clients/{$cs->client_id}?tab=kardex";
                $reminderKey = $daysBefore === 0 ? 'expires_today' : "expires_in_{$daysBefore}d";
                $data = [
                    'client_service_id' => $cs->id,
                    'service_id' => $cs->service_id,
                    'client_id' => $cs->client_id,
                    'assigned_to' => $cs->assigned_to,
                    'end_date' => $cs->end_date?->format('Y-m-d'),
                    'reminder' => $reminderKey,
                    'url' => $actionUrl,
                ];

                foreach ($recipientIds as $uid) {
                    $user = User::find($uid);
                    if (!$user) continue;
                    if (!$user->hasRole('super_admin') && !$user->hasPermission('services.expiry-reminders')) {
                        continue;
                    }
                    if ($this->alreadySent((int) $cs->id, (int) $uid, $reminderKey)) {
                        continue;
                    }

                    NotificationService::notifyMany([(int) $uid], 'service', $title, $message, $actionUrl, 'high', $data);
                    NotificationService::sendPushNotifications([(int) $uid], $title, $message, $actionUrl, $data);
                    $total++;
                }

                // Admin global siempre (dedupe interno por user_id)
                NotificationService::notifySuperAdmins('service', $title, $message, $actionUrl, 'high', $data);
            }
        }

        if ($total > 0) {
            $this->info("Se enviaron {$total} recordatorios de servicios.");
        }

        return 0;
    }

    private function alreadySent(int $clientServiceId, int $userId, string $reminderKey): bool
    {
        return Notification::query()
            ->where('user_id', $userId)
            ->where('type', 'service')
            ->where('data->client_service_id', $clientServiceId)
            ->where('data->reminder', $reminderKey)
            ->where('created_at', '>=', now()->subHours(20))
            ->exists();
    }
}


