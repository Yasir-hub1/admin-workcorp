<?php

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Schedules\ScheduleResource;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Schedule::with(['user.area', 'approvedBy']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('month') && !empty($request->month)) {
            $query->where('month', $request->month . '-01');
        }

        if ($request->has('is_approved') && $request->is_approved !== '') {
            $query->where('is_approved', $request->boolean('is_approved'));
        }

        // Si es personal, solo ver sus horarios
        // Si es jefe de área, ver horarios de su área
        // Si es super admin, ver todos
        $user = Auth::user();
        if ($user->isSuperAdmin()) {
            // Super admin ve todo
        } elseif ($user->isJefeArea()) {
            // Jefe de área ve horarios de su área
            if ($user->area_id) {
                $query->whereHas('user', function ($q) use ($user) {
                    $q->where('area_id', $user->area_id);
                });
            }
        } elseif ($user->isPersonal()) {
            // Personal solo ve sus horarios
            $query->where('user_id', $user->id);
        }

        $perPage = $request->get('per_page', 15);
        $schedules = $query->latest('month')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => ScheduleResource::collection($schedules->items()),
            'meta' => [
                'current_page' => $schedules->currentPage(),
                'last_page' => $schedules->lastPage(),
                'per_page' => $schedules->perPage(),
                'total' => $schedules->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => 'required|date_format:Y-m',
            'schedule_data' => 'required|array',
            'notes' => 'nullable|string',
        ]);

        $validated['user_id'] = Auth::id();
        $validated['is_approved'] = false;
        $validated['month'] = $validated['month'] . '-01';

        // Verificar si ya existe un horario para ese mes
        $existing = Schedule::where('user_id', Auth::id())
            ->where('month', $validated['month'])
            ->first();

        if ($existing) {
            $existing->update($validated);
            $schedule = $existing;
        } else {
            $schedule = Schedule::create($validated);
        }

        return response()->json([
            'success' => true,
            'message' => 'Horario guardado correctamente',
            'data' => new ScheduleResource($schedule->load(['user.area', 'approvedBy'])),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        // Usar find para evitar conflictos con Route Model Binding
        $schedule = Schedule::with(['user.area', 'approvedBy'])->find($id);

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Horario no encontrado',
            ], 404);
        }

        // Verificar permisos - Super Admin puede ver todo
        $user = Auth::user();
        if ($user->isSuperAdmin()) {
            // Super Admin puede ver todo - no hacer ninguna verificación adicional
        } elseif ($user->isJefeArea()) {
            // Jefe de área puede ver horarios de su área
            $schedule->load('user.area');
            if ($schedule->user && $schedule->user->area_id !== $user->area_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }
        } else {
            // Personal solo puede ver sus propios horarios
            if ($schedule->user_id !== $user->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }
        }

        return response()->json([
            'success' => true,
            'data' => new ScheduleResource($schedule),
        ]);
    }

    public function approve(Request $request, $id): JsonResponse
    {
        $schedule = Schedule::find($id);

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Horario no encontrado',
            ], 404);
        }

        $user = Auth::user();
        if (!$user->isSuperAdmin() && !$user->isJefeArea()) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        // Jefe de área solo puede aprobar horarios de su área
        if ($user->isJefeArea() && !$user->isSuperAdmin()) {
            if ($schedule->user->area_id !== $user->area_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes aprobar horarios de otra área',
                ], 403);
            }
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
        ]);

        $schedule->update([
            'is_approved' => true,
            'approved_by' => Auth::id(),
            'approved_at' => now(),
            'notes' => $validated['notes'] ?? $schedule->notes,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Horario aprobado',
            'data' => new ScheduleResource($schedule->load(['user.area', 'approvedBy'])),
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $schedule = Schedule::find($id);

        if (!$schedule) {
            return response()->json([
                'success' => false,
                'message' => 'Horario no encontrado',
            ], 404);
        }

        $user = Auth::user();
        if ($schedule->user_id !== $user->id && !$user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        if ($schedule->is_approved && !$user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes editar un horario ya aprobado',
            ], 400);
        }

        $validated = $request->validate([
            'schedule_data' => 'sometimes|array',
            'notes' => 'nullable|string',
        ]);

        $schedule->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Horario actualizado',
            'data' => new ScheduleResource($schedule->load(['user.area', 'approvedBy'])),
        ]);
    }
}
