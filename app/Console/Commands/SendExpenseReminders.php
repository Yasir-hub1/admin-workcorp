<?php

namespace App\Console\Commands;

use App\Models\Expense;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class SendExpenseReminders extends Command
{
    protected $signature = 'expenses:send-reminders';

    protected $description = 'Envía recordatorios de gastos pendientes a jefes de área y admins';

    public function handle(): int
    {
        $now = now();
        $total = 0;

        // Gastos pendientes con más de 24h desde su creación
        $expenses = Expense::query()
            ->where('status', 'pending')
            ->whereNotNull('area_id')
            ->where('created_at', '<=', $now->copy()->subHours(24))
            ->with(['createdBy', 'area'])
            ->orderBy('created_at')
            ->limit(200)
            ->get();

        foreach ($expenses as $e) {
            $areaId = (int) $e->area_id;
            if (!$areaId) continue;

            if ($this->alreadySent((int) $e->id, 'pending_over_24h')) {
                continue;
            }

            $creatorName = $e->createdBy?->name ?? 'Usuario';
            $amount = (string) $e->amount;
            $supplier = $e->supplier_name ?: '-';
            $title = 'Gasto pendiente de aprobación';
            $message = "Hay un gasto pendiente hace más de 24 horas.\n"
                . "Área: " . ($e->area?->name ?? 'Área') . "\n"
                . "Monto: {$amount}\n"
                . "Proveedor: {$supplier}\n"
                . "Registrado por: {$creatorName}\n"
                . "Registrado: " . ($e->created_at?->format('d/m/Y H:i') ?? '-');

            $actionUrl = "/expenses/{$e->id}";
            $data = [
                'expense_id' => $e->id,
                'area_id' => $areaId,
                'status' => $e->status,
                'amount' => $e->amount,
                'reminder' => 'pending_over_24h',
            ];

            NotificationService::notifyAreaManagersAndAdmins(
                $areaId,
                'expense',
                $title,
                $message,
                $actionUrl,
                'high',
                $data
            );

            $total++;
        }

        if ($total > 0) {
            $this->info("Se enviaron {$total} recordatorios de gastos.");
        }

        return 0;
    }

    private function alreadySent(int $expenseId, string $reminderKey): bool
    {
        return Notification::query()
            ->where('type', 'expense')
            ->where('data->expense_id', $expenseId)
            ->where('data->reminder', $reminderKey)
            ->where('created_at', '>=', now()->subHours(23))
            ->exists();
    }
}


