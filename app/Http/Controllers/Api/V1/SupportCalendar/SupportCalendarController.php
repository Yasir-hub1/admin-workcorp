<?php

namespace App\Http\Controllers\Api\V1\SupportCalendar;

use App\Http\Controllers\Controller;
use App\Models\SupportCalendarViewer;
use App\Models\SupportDutyAssignment;
use App\Models\Staff;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SupportCalendarController extends Controller
{
    public function access(): JsonResponse
    {
        $user = Auth::user();

        $isAdmin = $user->isSuperAdmin() || $user->hasPermission('support_calendar.manage');
        if ($isAdmin) {
            return response()->json(['success' => true, 'data' => ['can_view' => true, 'can_manage' => true]]);
        }

        $isViewer = SupportCalendarViewer::where('user_id', $user->id)->exists();
        if (!$isViewer) {
            // Si el usuario ya tiene al menos un sábado asignado, debe poder ver el calendario.
            // También auto-registramos su acceso para evitar problemas de visibilidad al iniciar sesión.
            $hasAnyAssignment = SupportDutyAssignment::where('user_id', $user->id)->exists();
            if ($hasAnyAssignment) {
                SupportCalendarViewer::firstOrCreate(['user_id' => $user->id], ['created_by' => null]);
                $isViewer = true;
            }
        }
        return response()->json([
            'success' => true,
            'data' => [
                'can_view' => $isViewer,
                'can_manage' => false,
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $start = $request->get('start_date', now()->startOfMonth()->toDateString());
        $end = $request->get('end_date', now()->endOfMonth()->toDateString());

        $isAdmin = $user->isSuperAdmin() || $user->hasPermission('support_calendar.manage');

        if (!$isAdmin) {
            $isViewer = SupportCalendarViewer::where('user_id', $user->id)->exists();
            if (!$isViewer) {
                // Si está asignado en cualquier sábado, también puede ver el calendario.
                $hasAnyAssignment = SupportDutyAssignment::where('user_id', $user->id)->exists();
                if ($hasAnyAssignment) {
                    SupportCalendarViewer::firstOrCreate(['user_id' => $user->id], ['created_by' => null]);
                    $isViewer = true;
                }
            }
            if (!$isViewer) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }
        }

        $assignments = SupportDutyAssignment::query()
            ->with(['user:id,name,email'])
            ->whereBetween('duty_date', [$start, $end])
            ->orderBy('duty_date')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'duty_date' => $a->duty_date?->toDateString(),
                'user_id' => $a->user_id,
                'user' => $a->user ? ['id' => $a->user->id, 'name' => $a->user->name, 'email' => $a->user->email] : null,
                'color' => $a->color,
                'notes' => $a->notes,
            ])
            ->values();

        $payload = [
            'assignments' => $assignments,
        ];

        if ($isAdmin) {
            $payload['viewers'] = SupportCalendarViewer::with('user:id,name,email')
                ->orderBy('id')
                ->get()
                ->map(fn ($v) => [
                    'user_id' => $v->user_id,
                    'user' => $v->user ? [
                        'id' => $v->user->id,
                        'name' => $v->user->name,
                        'email' => $v->user->email,
                    ] : null
                ])
                ->values();

            // Listado de "personal" asignable:
            // - Compatibilidad: usuarios antiguos pueden tener is_active = NULL
            // - Preferencia: rol "personal"
            // - Fallback: staff activo con user asociado
            $activeUsersBase = User::query()
                ->where(function ($q) {
                    $q->where('is_active', true)->orWhereNull('is_active');
                });

            $personalUserIds = $activeUsersBase
                ->whereHas('roles', fn ($q) => $q->where('name', 'personal'))
                ->pluck('id');

            $staffUserIds = Staff::query()
                ->whereNotNull('user_id')
                ->where('is_active', true)
                ->pluck('user_id');

            $payload['users'] = User::query()
                ->whereIn('id', $personalUserIds->merge($staffUserIds)->unique()->values())
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get();
        }

        return response()->json(['success' => true, 'data' => $payload]);
    }

    public function assign(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user->isSuperAdmin() && !$user->hasPermission('support_calendar.manage')) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'duty_date' => 'required|date',
            'user_id' => 'required|exists:users,id',
            'color' => 'nullable|string|max:30',
            'notes' => 'nullable|string|max:255',
        ]);

        $date = Carbon::parse($validated['duty_date'])->startOfDay();
        if ($date->dayOfWeek !== Carbon::SATURDAY) {
            return response()->json([
                'success' => false,
                'message' => 'La fecha debe ser sábado',
            ], 422);
        }

        $assignment = SupportDutyAssignment::updateOrCreate(
            ['duty_date' => $date->toDateString()],
            [
                'user_id' => (int) $validated['user_id'],
                'color' => $validated['color'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]
        );

        // Asegurar que el asignado pueda ver el calendario (viewer auto)
        SupportCalendarViewer::firstOrCreate(
            ['user_id' => (int) $validated['user_id']],
            ['created_by' => $user->id]
        );

        return response()->json([
            'success' => true,
            'message' => 'Sábado asignado correctamente',
            'data' => $assignment->load('user:id,name,email'),
        ]);
    }

    public function generate(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user->isSuperAdmin() && !$user->hasPermission('support_calendar.manage')) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'overwrite' => 'nullable|boolean',
        ]);

        $start = Carbon::parse($validated['start_date'])->startOfDay();
        $end = Carbon::parse($validated['end_date'])->startOfDay();
        $overwrite = (bool) ($validated['overwrite'] ?? false);
        $userIds = array_values(array_map('intval', $validated['user_ids']));

        // Iterar sábados
        $cursor = $start->copy();
        while ($cursor->dayOfWeek !== Carbon::SATURDAY) {
            $cursor->addDay();
            if ($cursor->gt($end)) break;
        }

        $i = 0;
        $createdOrUpdated = 0;
        while ($cursor->lte($end)) {
            $dutyDate = $cursor->toDateString();
            $assignedTo = $userIds[$i % count($userIds)];

            if (!$overwrite && SupportDutyAssignment::where('duty_date', $dutyDate)->exists()) {
                $cursor->addWeek();
                $i++;
                continue;
            }

            SupportDutyAssignment::updateOrCreate(
                ['duty_date' => $dutyDate],
                [
                    'user_id' => $assignedTo,
                    'created_by' => $user->id,
                ]
            );

            SupportCalendarViewer::firstOrCreate(
                ['user_id' => $assignedTo],
                ['created_by' => $user->id]
            );

            $createdOrUpdated++;
            $cursor->addWeek();
            $i++;
        }

        return response()->json([
            'success' => true,
            'message' => "Generación completada ({$createdOrUpdated} sábados)",
        ]);
    }

    public function setViewers(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user->isSuperAdmin() && !$user->hasPermission('support_calendar.manage')) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $ids = collect($validated['user_ids'])->map(fn ($v) => (int) $v)->unique()->values();

        // Regla de negocio: si alguien ya tiene sábados asignados, NO puede perder acceso al calendario
        // (si no, el personal entra y no ve su propio turno).
        $assignedUserIds = SupportDutyAssignment::query()
            ->select('user_id')
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->unique()
            ->values();

        $ids = $ids->merge($assignedUserIds)->unique()->values();

        SupportCalendarViewer::query()->whereNotIn('user_id', $ids->toArray())->delete();
        foreach ($ids as $id) {
            SupportCalendarViewer::firstOrCreate(['user_id' => $id], ['created_by' => $user->id]);
        }

        return response()->json(['success' => true, 'message' => 'Visibilidad actualizada']);
    }
}


