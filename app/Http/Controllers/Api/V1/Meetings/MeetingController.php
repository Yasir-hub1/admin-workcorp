<?php

namespace App\Http\Controllers\Api\V1\Meetings;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use App\Services\NotificationService;
use App\Support\Visibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MeetingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Meeting::with(['organizer', 'area']);

        if ($request->has('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('status') && ! empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('start_time', [$request->start_date, $request->end_date]);
        }

        $user = Auth::user();
        Visibility::apply($query, $user, 'meetings', 'organizer_id');

        $perPage = $request->get('per_page', 15);
        $meetings = $query->latest('start_time')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $meetings->items(),
            'meta' => [
                'current_page' => $meetings->currentPage(),
                'last_page' => $meetings->lastPage(),
                'per_page' => $meetings->perPage(),
                'total' => $meetings->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'location' => 'nullable|string',
            'meeting_type' => 'required|in:internal,external,client',
            'area_id' => 'nullable|exists:areas,id',
            'attendees' => 'nullable|array',
            'attendees.*' => 'exists:users,id',
            'agenda' => 'nullable|string',
            'meeting_link' => 'nullable|url',
            'send_reminders' => 'nullable|boolean',
        ]);

        // Asegurar que attendees sea un array (puede estar vacío)
        $validated['attendees'] = $validated['attendees'] ?? [];

        $validated['organizer_id'] = Auth::id();
        $validated['status'] = 'scheduled';
        $validated['send_reminders'] = $validated['send_reminders'] ?? true;
        if (empty($validated['area_id'])) {
            $validated['area_id'] = Visibility::areaId(Auth::user());
        }

        $meeting = Meeting::create($validated);

        // Notificar a los asistentes asignados al crear la reunión (DB + Push)
        if (! empty($validated['attendees'])) {
            $attendeeIds = $validated['attendees'];
            $startTime = \Carbon\Carbon::parse($validated['start_time']);
            $endTime = \Carbon\Carbon::parse($validated['end_time']);
            $formattedStart = $startTime->format('d/m/Y H:i');
            $formattedEnd = $endTime->format('d/m/Y H:i');
            $organizerName = Auth::user()?->name ?? 'Organizador';

            $messageParts = [
                'Has sido invitado a una reunión.',
                "Título: {$validated['title']}",
                "Organizador: {$organizerName}",
                "Inicio: {$formattedStart}",
                "Fin: {$formattedEnd}",
            ];

            if (! empty($validated['location'])) {
                $messageParts[] = "Ubicación: {$validated['location']}";
            }
            if (! empty($validated['meeting_link'])) {
                $messageParts[] = "Enlace: {$validated['meeting_link']}";
            }
            if (! empty($validated['agenda'])) {
                $agenda = trim($validated['agenda']);
                $agenda = mb_strlen($agenda) > 160 ? (mb_substr($agenda, 0, 160).'...') : $agenda;
                $messageParts[] = "Agenda: {$agenda}";
            }

            $title = 'Nueva reunión: '.$validated['title'];
            $message = implode("\n", $messageParts);
            $actionUrl = "/meetings/{$meeting->id}";
            $data = [
                'meeting_id' => $meeting->id,
                'organizer_id' => $meeting->organizer_id,
                'area_id' => $meeting->area_id,
                'start_time' => $meeting->start_time?->toISOString(),
                'end_time' => $meeting->end_time?->toISOString(),
                'location' => $meeting->location,
                'meeting_link' => $meeting->meeting_link,
            ];

            NotificationService::notifyMany($attendeeIds, 'meeting', $title, $message, $actionUrl, 'normal', $data);
            NotificationService::sendPushNotifications($attendeeIds, $title, $message, $actionUrl, $data);

            // Admin debe recibir notificación de toda reunión creada
            try {
                $adminTitle = 'Reunión creada: '.$validated['title'];
                $adminMessage = "Se creó una reunión.\n"
                    ."Título: {$validated['title']}\n"
                    ."Organizador: {$organizerName}\n"
                    ."Inicio: {$formattedStart}\n"
                    ."Fin: {$formattedEnd}\n"
                    .'Asistentes: '.count($attendeeIds);
                NotificationService::notifySuperAdmins('meeting', $adminTitle, $adminMessage, $actionUrl, 'normal', $data);
            } catch (\Throwable $e) {
                \Log::error('Meeting create: notify super admins failed', [
                    'meeting_id' => $meeting->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Reunión creada correctamente',
            'data' => $meeting->load(['organizer', 'area']),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $meeting = Meeting::with(['organizer', 'area'])->find($id);

        if (! $meeting) {
            return response()->json([
                'success' => false,
                'message' => 'Reunión no encontrada',
            ], 404);
        }

        $user = Auth::user();
        if (! $user->isSuperAdmin()) {
            $areaId = Visibility::areaId($user);
            if ($areaId && (int) $meeting->area_id !== (int) $areaId) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }
            if (! $areaId) {
                $isOrganizer = $meeting->organizer_id === $user->id;
                $isAttendee = in_array($user->id, $meeting->attendees ?? []);
                if (! $isOrganizer && ! $isAttendee) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No autorizado',
                    ], 403);
                }
            }
        }

        return response()->json([
            'success' => true,
            'data' => $meeting,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $meeting = Meeting::find($id);

        if (! $meeting) {
            return response()->json([
                'success' => false,
                'message' => 'Reunión no encontrada',
            ], 404);
        }

        $user = Auth::user();
        if ($meeting->organizer_id !== $user->id && ! $user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'sometimes|date',
            'end_time' => 'sometimes|date|after:start_time',
            'location' => 'nullable|string',
            'meeting_type' => 'sometimes|in:internal,external,client',
            'area_id' => 'nullable|exists:areas,id',
            'attendees' => 'nullable|array',
            'attendees.*' => 'exists:users,id',
            'agenda' => 'nullable|string',
            'meeting_link' => 'nullable|url',
            'send_reminders' => 'nullable|boolean',
            'status' => 'sometimes|in:scheduled,in_progress,completed,cancelled',
        ]);

        // Asegurar que attendees sea un array (puede estar vacío)
        if (isset($validated['attendees'])) {
            $validated['attendees'] = $validated['attendees'] ?? [];
        }

        $meeting->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Reunión actualizada',
            'data' => $meeting->load(['organizer', 'area']),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $meeting = Meeting::find($id);

        if (! $meeting) {
            return response()->json([
                'success' => false,
                'message' => 'Reunión no encontrada',
            ], 404);
        }

        $user = Auth::user();
        if ($meeting->organizer_id !== $user->id && ! $user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        $meeting->delete();

        return response()->json([
            'success' => true,
            'message' => 'Reunión eliminada',
        ]);
    }

    /**
     * Reenviar notificación push a los asistentes asignados.
     * Solo organizador o super admin.
     */
    public function resendPush($id): JsonResponse
    {
        $meeting = Meeting::with(['organizer'])->find($id);

        if (! $meeting) {
            return response()->json([
                'success' => false,
                'message' => 'Reunión no encontrada',
            ], 404);
        }

        $user = Auth::user();
        if ($meeting->organizer_id !== $user->id && ! $user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        $attendeeIds = is_array($meeting->attendees) ? $meeting->attendees : [];
        if (empty($attendeeIds)) {
            return response()->json([
                'success' => false,
                'message' => 'La reunión no tiene asistentes asignados',
            ], 400);
        }

        $formattedStart = $meeting->start_time?->format('d/m/Y H:i') ?? '-';
        $formattedEnd = $meeting->end_time?->format('d/m/Y H:i') ?? '-';
        $organizerName = $meeting->organizer?->name ?? 'Organizador';

        $messageParts = [
            'Recordatorio de reunión.',
            "Título: {$meeting->title}",
            "Organizador: {$organizerName}",
            "Inicio: {$formattedStart}",
            "Fin: {$formattedEnd}",
        ];
        if (! empty($meeting->location)) {
            $messageParts[] = "Ubicación: {$meeting->location}";
        }
        if (! empty($meeting->meeting_link)) {
            $messageParts[] = "Enlace: {$meeting->meeting_link}";
        }
        if (! empty($meeting->agenda)) {
            $agenda = trim($meeting->agenda);
            $agenda = mb_strlen($agenda) > 160 ? (mb_substr($agenda, 0, 160).'...') : $agenda;
            $messageParts[] = "Agenda: {$agenda}";
        }

        $title = 'Reunión (reenvío): '.$meeting->title;
        $message = implode("\n", $messageParts);
        $actionUrl = "/meetings/{$meeting->id}";
        $data = [
            'meeting_id' => $meeting->id,
            'organizer_id' => $meeting->organizer_id,
            'area_id' => $meeting->area_id,
            'start_time' => $meeting->start_time?->toISOString(),
            'end_time' => $meeting->end_time?->toISOString(),
            'location' => $meeting->location,
            'meeting_link' => $meeting->meeting_link,
            'resend' => true,
        ];

        try {
            // Guardar en BD (histórico) + Push
            NotificationService::notifyMany($attendeeIds, 'meeting', $title, $message, $actionUrl, 'normal', $data);
            NotificationService::sendPushNotifications($attendeeIds, $title, $message, $actionUrl, $data);
        } catch (\Throwable $e) {
            \Log::error('Meeting resend push failed', [
                'meeting_id' => $meeting->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notificación reenviada',
        ]);
    }
}
