<?php

namespace App\Http\Controllers\Api\V1\Requests;

use App\Http\Controllers\Controller;
use App\Http\Requests\Requests\StoreRequestRequest;
use App\Http\Requests\Requests\UpdateRequestRequest;
use App\Http\Resources\V1\Requests\RequestResource;
use App\Models\Request;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request as HttpRequest;
use Illuminate\Support\Facades\Auth;

class RequestController extends Controller
{
    /**
     * Display a listing of requests.
     */
    public function index(HttpRequest $request): JsonResponse
    {
        $query = Request::with([
            'user:id,name,email',
            'approvedBy:id,name,email',
            'area:id,name,code'
        ]);

        // Filtros
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        // Filtros por permisos (Super Admin ve todo)
        $user = Auth::user();
        
        if ($user->isSuperAdmin()) {
            // Super Admin ve todo, no se aplican filtros
        } elseif ($user->hasPermission('requests.view-area') && $user->area_id) {
            // Jefe de área ve solicitudes de su área
            $query->where('area_id', $user->area_id);
        } elseif ($user->hasPermission('requests.view-own')) {
            // Personal solo ve sus propias solicitudes
            $query->where('user_id', $user->id);
        }

        // Paginación
        $perPage = $request->get('per_page', 15);
        $requests = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => RequestResource::collection($requests->items()),
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }

    /**
     * Store a newly created request.
     */
    public function store(StoreRequestRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = Auth::user();

        $validated['user_id'] = $user->id;
        $validated['status'] = 'pending';
        
        // Si no se proporciona area_id, usar el área del usuario
        if (!isset($validated['area_id']) && $user->area_id) {
            $validated['area_id'] = $user->area_id;
        }

        // Calcular días si no se proporciona
        if (!isset($validated['days_requested']) && isset($validated['start_date']) && isset($validated['end_date'])) {
            $start = \Carbon\Carbon::parse($validated['start_date']);
            $end = \Carbon\Carbon::parse($validated['end_date']);
            $validated['days_requested'] = $start->diffInDays($end) + 1;
        }

        $requestModel = Request::create($validated);

        // Si quien crea es "personal", notificar a jefes de su área y a super admins
        // (solo ellos pueden ver/gestionar solicitudes ajenas según permisos actuales).
        try {
            if ($user->isPersonal()) {
                $areaId = $requestModel->area_id ?: $user->area_id;
                if ($areaId) {
                    $staffName = $user->staff
                        ? trim(($user->staff->first_name ?? '') . ' ' . ($user->staff->last_name ?? ''))
                        : $user->name;

                    if (empty($staffName)) {
                        $staffName = $user->email;
                    }

                    $typeLabels = [
                        'permission' => 'Permiso',
                        'vacation' => 'Vacaciones',
                        'license' => 'Licencia',
                        'schedule_change' => 'Cambio de Horario',
                        'advance' => 'Adelanto',
                    ];
                    $typeLabel = $typeLabels[$requestModel->type] ?? $requestModel->type;

                    $title = sprintf('Nueva solicitud (%s) - %s', $typeLabel, $staffName);
                    $message = sprintf(
                        "%s registró una solicitud.\nTítulo: %s\nFechas: %s - %s\nEstado: Pendiente",
                        $staffName,
                        $requestModel->title,
                        $requestModel->start_date?->format('d/m/Y') ?? '-',
                        $requestModel->end_date?->format('d/m/Y') ?? '-'
                    );

                    // Link SPA a detalle (RequestDetailPage)
                    $actionUrl = '/requests/' . $requestModel->id;

                    $data = [
                        'request_id' => $requestModel->id,
                        'type' => $requestModel->type,
                        'status' => $requestModel->status,
                        'area_id' => $areaId,
                        'user_id' => $user->id,
                    ];

                    NotificationService::notifyAreaManagersAndAdmins(
                        (int) $areaId,
                        'requests',
                        $title,
                        $message,
                        $actionUrl,
                        'normal',
                        $data
                    );
                }
            }
        } catch (\Throwable $e) {
            // No romper la creación de la solicitud por fallos de notificaciones
            \Log::error('Request create: notification failed', [
                'request_id' => $requestModel->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Solicitud creada correctamente',
            'data' => new RequestResource($requestModel->load(['user', 'approvedBy', 'area'])),
        ], 201);
    }

    /**
     * Display the specified request.
     */
    public function show(HttpRequest $httpRequest, $id): JsonResponse
    {
        // Buscar el modelo manualmente para evitar conflictos con route model binding
        $requestModel = Request::with(['user', 'approvedBy', 'area'])->find($id);
        
        if (!$requestModel) {
            return response()->json([
                'success' => false,
                'message' => 'Solicitud no encontrada',
            ], 404);
        }
        
        $user = Auth::user();
        
        // Verificar permisos de visualización (Super Admin siempre puede ver)
        if (!$user->isSuperAdmin()) {
            // Si tiene permiso de ver todas, puede ver
            if ($user->hasPermission('requests.view-all')) {
                // Puede ver todas
            } elseif ($user->hasPermission('requests.view-area') && $user->area_id) {
                // Solo puede ver solicitudes de su área
                if ($requestModel->area_id !== $user->area_id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No tienes permisos para ver esta solicitud',
                    ], 403);
                }
            } elseif ($user->hasPermission('requests.view-own')) {
                // Solo puede ver sus propias solicitudes
                if ($requestModel->user_id !== $user->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No tienes permisos para ver esta solicitud',
                    ], 403);
                }
            } else {
                // No tiene ningún permiso de visualización
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permisos para ver solicitudes',
                ], 403);
            }
        }
        
        return response()->json([
            'success' => true,
            'data' => new RequestResource($requestModel),
        ]);
    }

    /**
     * Approve a request.
     */
    public function approve(HttpRequest $request, $id): JsonResponse
    {
        $requestModel = Request::find($id);
        
        if (!$requestModel) {
            return response()->json([
                'success' => false,
                'message' => 'Solicitud no encontrada',
            ], 404);
        }
        
        $user = Auth::user();

        // Verificar permisos (Super Admin siempre puede)
        if (!$user->isSuperAdmin() && !$user->hasPermission('requests.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para aprobar solicitudes',
            ], 403);
        }

        // Verificar que esté pendiente
        if ($requestModel->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Esta solicitud ya fue procesada',
            ], 400);
        }

        $validated = $request->validate([
            'approval_notes' => 'nullable|string',
        ]);

        $requestModel->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'approval_notes' => $validated['approval_notes'] ?? null,
        ]);

        // Notificar al personal (creador) cuando su solicitud es aprobada
        try {
            $creator = $requestModel->user;
            if ($creator && $creator->isPersonal()) {
                $title = 'Solicitud aprobada';
                $message = sprintf(
                    "Tu solicitud fue aprobada.\nTítulo: %s\nTipo: %s",
                    $requestModel->title,
                    $requestModel->type
                );
                $actionUrl = '/requests/' . $requestModel->id;
                $data = [
                    'request_id' => $requestModel->id,
                    'status' => $requestModel->status,
                    'type' => $requestModel->type,
                    'area_id' => $requestModel->area_id,
                ];

                NotificationService::notifyMany([$creator->id], 'requests', $title, $message, $actionUrl, 'normal', $data);
                NotificationService::sendPushNotifications([$creator->id], $title, $message, $actionUrl, $data);
            }
        } catch (\Throwable $e) {
            \Log::error('Request approve: notify creator failed', [
                'request_id' => $requestModel->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Solicitud aprobada correctamente',
            'data' => new RequestResource($requestModel->load(['user', 'approvedBy', 'area'])),
        ]);
    }

    /**
     * Reject a request.
     */
    public function reject(HttpRequest $request, $id): JsonResponse
    {
        $requestModel = Request::find($id);
        
        if (!$requestModel) {
            return response()->json([
                'success' => false,
                'message' => 'Solicitud no encontrada',
            ], 404);
        }
        
        $user = Auth::user();

        // Verificar permisos (Super Admin siempre puede)
        if (!$user->isSuperAdmin() && !$user->hasPermission('requests.reject')) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para rechazar solicitudes',
            ], 403);
        }

        // Verificar que esté pendiente
        if ($requestModel->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Esta solicitud ya fue procesada',
            ], 400);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string',
        ]);

        $requestModel->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        // Notificar al personal (creador) cuando su solicitud es rechazada
        try {
            $creator = $requestModel->user;
            if ($creator && $creator->isPersonal()) {
                $title = 'Solicitud rechazada';
                $message = sprintf(
                    "Tu solicitud fue rechazada.\nTítulo: %s\nMotivo: %s",
                    $requestModel->title,
                    $requestModel->rejection_reason
                );
                $actionUrl = '/requests/' . $requestModel->id;
                $data = [
                    'request_id' => $requestModel->id,
                    'status' => $requestModel->status,
                    'type' => $requestModel->type,
                    'area_id' => $requestModel->area_id,
                ];

                NotificationService::notifyMany([$creator->id], 'requests', $title, $message, $actionUrl, 'normal', $data);
                NotificationService::sendPushNotifications([$creator->id], $title, $message, $actionUrl, $data);
            }
        } catch (\Throwable $e) {
            \Log::error('Request reject: notify creator failed', [
                'request_id' => $requestModel->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Solicitud rechazada',
            'data' => new RequestResource($requestModel->load(['user', 'approvedBy', 'area'])),
        ]);
    }

    /**
     * Update the specified request.
     */
    public function update(UpdateRequestRequest $request, $id): JsonResponse
    {
        $requestModel = Request::find($id);
        
        if (!$requestModel) {
            return response()->json([
                'success' => false,
                'message' => 'Solicitud no encontrada',
            ], 404);
        }
        
        // Verificar que esté pendiente (Super Admin puede editar cualquier estado)
        $user = Auth::user();
        if (!$user->isSuperAdmin() && $requestModel->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Solo puedes editar solicitudes pendientes',
            ], 400);
        }

        $validated = $request->validated();
        
        // Recalcular días si se actualizan las fechas
        if (isset($validated['start_date']) || isset($validated['end_date'])) {
            $startDate = $validated['start_date'] ?? $requestModel->start_date;
            $endDate = $validated['end_date'] ?? $requestModel->end_date;
            
            if ($startDate && $endDate) {
                $start = \Carbon\Carbon::parse($startDate);
                $end = \Carbon\Carbon::parse($endDate);
                $validated['days_requested'] = $start->diffInDays($end) + 1;
            }
        }

        $requestModel->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Solicitud actualizada correctamente',
            'data' => new RequestResource($requestModel->load(['user', 'approvedBy', 'area'])),
        ]);
    }

    /**
     * Cancel a request.
     */
    public function cancel($id): JsonResponse
    {
        $requestModel = Request::find($id);
        
        if (!$requestModel) {
            return response()->json([
                'success' => false,
                'message' => 'Solicitud no encontrada',
            ], 404);
        }
        
        if ($requestModel->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes cancelar esta solicitud',
            ], 403);
        }

        if ($requestModel->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Solo puedes cancelar solicitudes pendientes',
            ], 400);
        }

        $requestModel->update([
            'status' => 'cancelled',
        ]);

        // Notificar al personal (creador) cuando su solicitud es cancelada (útil para multi-dispositivo)
        try {
            $creator = $requestModel->user;
            if ($creator && $creator->isPersonal()) {
                $title = 'Solicitud cancelada';
                $message = sprintf(
                    "Tu solicitud fue cancelada.\nTítulo: %s\nTipo: %s",
                    $requestModel->title,
                    $requestModel->type
                );
                $actionUrl = '/requests/' . $requestModel->id;
                $data = [
                    'request_id' => $requestModel->id,
                    'status' => $requestModel->status,
                    'type' => $requestModel->type,
                    'area_id' => $requestModel->area_id,
                ];

                NotificationService::notifyMany([$creator->id], 'requests', $title, $message, $actionUrl, 'normal', $data);
                NotificationService::sendPushNotifications([$creator->id], $title, $message, $actionUrl, $data);
            }
        } catch (\Throwable $e) {
            \Log::error('Request cancel: notify creator failed', [
                'request_id' => $requestModel->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Solicitud cancelada',
            'data' => new RequestResource($requestModel->load(['user', 'approvedBy', 'area'])),
        ]);
    }

    /**
     * Get statistics.
     */
    public function statistics(HttpRequest $request): JsonResponse
    {
        $query = Request::query();

        // Filtros
        if ($request->has('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('start_date', [$request->start_date, $request->end_date]);
        }

        $stats = [
            'total' => $query->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'approved' => (clone $query)->where('status', 'approved')->count(),
            'rejected' => (clone $query)->where('status', 'rejected')->count(),
            'by_type' => (clone $query)->selectRaw('type, COUNT(*) as count')
                ->groupBy('type')
                ->pluck('count', 'type'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
