<?php

namespace App\Http\Controllers\Api\V1\Tickets;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Tickets\TicketResource;
use App\Models\TicketCategory;
use App\Models\Ticket;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class TicketController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with(['createdBy', 'assignedTo', 'area', 'client']);

        // Filtros - solo aplicar si tienen valor
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        if ($request->has('priority') && !empty($request->priority)) {
            $query->where('priority', $request->priority);
        }

        if ($request->has('assigned_to') && !empty($request->assigned_to)) {
            $query->where('assigned_to', $request->assigned_to);
        }

        // Filtros por permisos - Super Admin ve todo
        $user = Auth::user();
        if ($user->isSuperAdmin()) {
            // Super Admin ve todos los tickets - no aplicar filtros de usuario
        } elseif ($user->hasRole('personal')) {
            // Personal ve tickets creados por él o asignados a él (soporte)
            $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)
                  ->orWhere('assigned_to', $user->id);
            });
        } elseif ($user->hasRole('jefe_area') && $user->area_id) {
            // Jefe de área ve tickets de su área
            $query->where('area_id', $user->area_id);
        }

        $perPage = $request->get('per_page', 15);
        $tickets = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => TicketResource::collection($tickets->items()),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'per_page' => $tickets->perPage(),
                'total' => $tickets->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|string|max:80',
            'priority' => 'required|in:low,medium,high,urgent',
            'area_id' => 'nullable|exists:areas,id',
            'client_id' => 'required|exists:clients,id',
            'assigned_to' => 'required|exists:users,id',
            'attachments' => 'nullable|array',
        ]);

        $validated['created_by'] = Auth::id();
        $validated['status'] = 'assigned';

        // Mantener un catálogo de categorías para buscador / evitar duplicados
        try {
            $categoryName = trim($validated['category']);
            $slug = Str::slug($categoryName);
            if ($slug === '') {
                $slug = Str::slug(Str::ascii($categoryName));
            }
            if ($slug !== '') {
                $cat = TicketCategory::withTrashed()->where('slug', $slug)->first();
                if ($cat) {
                    if ($cat->trashed()) {
                        $cat->restore();
                    }
                    $cat->update(['name' => $categoryName, 'is_active' => true]);
                } else {
                    TicketCategory::create(['name' => $categoryName, 'slug' => $slug, 'is_active' => true]);
                }
                $validated['category'] = $categoryName;
            }
        } catch (\Throwable $e) {
            // No romper la creación de ticket si falla el catálogo
        }

        // Calcular SLA
        $slaHours = match($validated['priority']) {
            'urgent' => 2,
            'high' => 8,
            'medium' => 24,
            'low' => 72,
        };
        $validated['sla_hours'] = $slaHours;
        $validated['sla_due_at'] = now()->addHours($slaHours);

        $ticket = Ticket::create($validated);

        // Notificar (BD + Push) al soporte asignado
        try {
            $assignedId = (int) $ticket->assigned_to;
            $creator = Auth::user();
            $ticket->loadMissing(['client', 'createdBy', 'assignedTo']);

            $clientName = $ticket->client?->business_name ?? $ticket->client?->legal_name ?? 'Cliente';
            $title = "Ticket asignado: {$ticket->ticket_number}";
            $message = "Nuevo ticket para {$clientName}\n"
                . "Título: {$ticket->title}\n"
                . "Categoría: {$ticket->category}\n"
                . "Prioridad: {$ticket->priority}\n"
                . "Creado por: " . ($creator?->name ?? 'Sistema');
            $actionUrl = "/tickets/{$ticket->id}";
            $data = [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'client_id' => $ticket->client_id,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
            ];

            NotificationService::notifyMany([$assignedId], 'ticket', $title, $message, $actionUrl, 'normal', $data);
            NotificationService::sendPushNotifications([$assignedId], $title, $message, $actionUrl, $data);

            // Admin debe enterarse de todo ticket creado/asignado
            $assignedName = $ticket->assignedTo?->name ?? ('Usuario #' . $assignedId);
            $adminTitle = "Nuevo ticket creado: {$ticket->ticket_number}";
            $adminMessage = "Se creó un ticket y fue asignado.\n"
                . "Cliente: {$clientName}\n"
                . "Título: {$ticket->title}\n"
                . "Asignado a: {$assignedName}\n"
                . "Prioridad: {$ticket->priority}\n"
                . "Creado por: " . ($creator?->name ?? 'Sistema');
            NotificationService::notifySuperAdmins('ticket', $adminTitle, $adminMessage, $actionUrl, 'normal', array_merge($data, [
                'assigned_to' => $assignedId,
            ]));
        } catch (\Throwable $e) {
            \Log::error('Ticket creation: notification to assigned support failed', [
                'ticket_id' => $ticket->id,
                'assigned_to' => $ticket->assigned_to,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ticket creado correctamente',
            'data' => $ticket->load(['createdBy', 'assignedTo', 'area', 'client']),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $ticket = Ticket::with(['createdBy', 'assignedTo', 'resolvedBy', 'area', 'client'])->find($id);

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket no encontrado',
            ], 404);
        }

        // Verificar permisos - Super Admin puede ver todo
        $user = Auth::user();
        if ($user->isSuperAdmin()) {
            // Super Admin puede ver todo - no hacer ninguna verificación adicional
        } elseif ($user->hasRole('personal')) {
            // Personal puede ver tickets creados por él o asignados a él
            if ($ticket->created_by !== $user->id && (int) $ticket->assigned_to !== (int) $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }
        } elseif ($user->hasRole('jefe_area') && $user->area_id) {
            // Jefe de área solo puede ver tickets de su área
            if ($ticket->area_id !== $user->area_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => new TicketResource($ticket),
        ]);
    }

    public function assign(Request $request, $id): JsonResponse
    {
        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'assigned_to' => 'required|exists:users,id',
        ]);

        $previousAssignedTo = $ticket->assigned_to;

        $ticket->update([
            'assigned_to' => $validated['assigned_to'],
            'status' => 'assigned',
        ]);

        // Notificar (BD + Push) al nuevo asignado
        try {
            $assignedId = (int) $ticket->assigned_to;
            $actor = Auth::user();
            $ticket->loadMissing(['client', 'createdBy', 'assignedTo']);

            $clientName = $ticket->client?->business_name ?? $ticket->client?->legal_name ?? 'Cliente';
            $title = $previousAssignedTo ? "Ticket reasignado: {$ticket->ticket_number}" : "Ticket asignado: {$ticket->ticket_number}";
            $message = "Ticket para {$clientName}\n"
                . "Título: {$ticket->title}\n"
                . "Categoría: {$ticket->category}\n"
                . "Prioridad: {$ticket->priority}\n"
                . "Asignado por: " . ($actor?->name ?? 'Sistema');
            $actionUrl = "/tickets/{$ticket->id}";
            $data = [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'client_id' => $ticket->client_id,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
                'previous_assigned_to' => $previousAssignedTo,
            ];

            NotificationService::notifyMany([$assignedId], 'ticket', $title, $message, $actionUrl, 'normal', $data);
            NotificationService::sendPushNotifications([$assignedId], $title, $message, $actionUrl, $data);

            // Admin también debe recibir notificación de reasignación/asignación
            $assignedName = $ticket->assignedTo?->name ?? ('Usuario #' . $assignedId);
            $adminTitle = $previousAssignedTo ? "Ticket reasignado: {$ticket->ticket_number}" : "Ticket asignado: {$ticket->ticket_number}";
            $adminMessage = "Se actualizó la asignación de un ticket.\n"
                . "Cliente: {$clientName}\n"
                . "Título: {$ticket->title}\n"
                . "Asignado a: {$assignedName}\n"
                . "Por: " . ($actor?->name ?? 'Sistema');
            NotificationService::notifySuperAdmins('ticket', $adminTitle, $adminMessage, $actionUrl, 'normal', $data);
        } catch (\Throwable $e) {
            \Log::error('Ticket assign: notification to assigned support failed', [
                'ticket_id' => $ticket->id,
                'assigned_to' => $ticket->assigned_to,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ticket asignado correctamente',
            'data' => $ticket->load(['assignedTo', 'client']),
        ]);
    }

    public function resendPush(Request $request, $id): JsonResponse
    {
        $ticket = Ticket::with(['client', 'createdBy', 'assignedTo'])->find($id);

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket no encontrado',
            ], 404);
        }

        if (!$ticket->assigned_to) {
            return response()->json([
                'success' => false,
                'message' => 'El ticket no tiene un usuario asignado',
            ], 422);
        }

        try {
            $assignedId = (int) $ticket->assigned_to;
            $actor = Auth::user();

            $clientName = $ticket->client?->business_name ?? $ticket->client?->legal_name ?? 'Cliente';
            $title = "Recordatorio: {$ticket->ticket_number}";
            $message = "Recordatorio de ticket para {$clientName}\n"
                . "Título: {$ticket->title}\n"
                . "Categoría: {$ticket->category}\n"
                . "Prioridad: {$ticket->priority}\n"
                . "Reenviado por: " . ($actor?->name ?? 'Sistema');
            $actionUrl = "/tickets/{$ticket->id}";
            $data = [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'client_id' => $ticket->client_id,
                'category' => $ticket->category,
                'priority' => $ticket->priority,
                'status' => $ticket->status,
                'resend' => true,
            ];

            NotificationService::notifyMany([$assignedId], 'ticket', $title, $message, $actionUrl, 'normal', $data);
            NotificationService::sendPushNotifications([$assignedId], $title, $message, $actionUrl, $data);

            // Admin también recibe registro del reenvío (auditable)
            NotificationService::notifySuperAdmins('ticket', $title, $message, $actionUrl, 'normal', $data);
        } catch (\Throwable $e) {
            \Log::error('Ticket resend push failed', [
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'No se pudo reenviar la notificación',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notificación reenviada correctamente',
        ]);
    }

    public function resolve(Request $request, $id): JsonResponse
    {
        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'resolution_notes' => 'required|string',
        ]);

        $ticket->update([
            'status' => 'resolved',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
            'resolution_notes' => $validated['resolution_notes'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ticket resuelto',
            'data' => $ticket->load(['resolvedBy']),
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $ticket = Ticket::find($id);

        if (!$ticket) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket no encontrado',
            ], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'status' => 'sometimes|in:open,assigned,in_progress,resolved,closed,cancelled',
            'priority' => 'sometimes|in:low,medium,high,urgent',
        ]);

        $ticket->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Ticket actualizado',
            'data' => $ticket->load(['createdBy', 'assignedTo']),
        ]);
    }

    public function statistics(Request $request): JsonResponse
    {
        $query = Ticket::query();

        // Aplicar filtros de área si se proporciona
        if ($request->has('area_id') && !empty($request->area_id)) {
            $query->where('area_id', $request->area_id);
        }

        // Filtros por permisos - Super Admin ve todo
        $user = Auth::user();
        if ($user->isSuperAdmin()) {
            // Super Admin ve todas las estadísticas - no aplicar filtros de usuario
        } elseif ($user->hasRole('personal')) {
            // Personal solo ve estadísticas de sus tickets
            $query->where('created_by', $user->id);
        } elseif ($user->hasRole('jefe_area') && $user->area_id) {
            // Jefe de área ve estadísticas de su área
            $query->where('area_id', $user->area_id);
        }

        $stats = [
            'total' => $query->count(),
            'open' => (clone $query)->where('status', 'open')->count(),
            'in_progress' => (clone $query)->where('status', 'in_progress')->count(),
            'resolved' => (clone $query)->where('status', 'resolved')->count(),
            'by_category' => (clone $query)->selectRaw('category, COUNT(*) as count')
                ->groupBy('category')
                ->pluck('count', 'category'),
            'by_priority' => (clone $query)->selectRaw('priority, COUNT(*) as count')
                ->groupBy('priority')
                ->pluck('count', 'priority'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
