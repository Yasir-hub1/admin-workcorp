<?php

namespace App\Http\Controllers\Api\V1\Notifications;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Display a listing of notifications.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        // Super Admin puede ver todas las notificaciones del sistema
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            $query = Notification::query()->with(['user:id,name,email']);
            if ($request->filled('user_id')) {
                $query->where('user_id', (int) $request->user_id);
            }
        } else {
            $query = Notification::where('user_id', $user->id);
        }

        // Filtros
        if ($request->has('is_read')) {
            $query->where('is_read', $request->boolean('is_read'));
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        // Paginación
        $perPage = $request->get('per_page', 20);
        $notifications = $query->latest()->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ],
        ]);
    }

    /**
     * Get unread notifications count.
     */
    public function unreadCount(): JsonResponse
    {
        $user = Auth::user();
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            $query = Notification::where('is_read', false);
            if (request()->filled('user_id')) {
                $query->where('user_id', (int) request()->user_id);
            }
            $count = $query->count();
        } else {
            $count = Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->count();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'count' => $count,
            ],
        ]);
    }

    /**
     * Mark notification as read.
     */
    public function markAsRead(Notification $notification): JsonResponse
    {
        $user = Auth::user();
        // Super Admin puede marcar como leída cualquier notificación (vista global)
        if (!(method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) && $notification->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Notificación marcada como leída',
            'data' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead(): JsonResponse
    {
        $user = Auth::user();
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            $query = Notification::where('is_read', false);
            // Opcional: permitir marcar por usuario específico
            if (request()->filled('user_id')) {
                $query->where('user_id', (int) request()->user_id);
            }
            $query->update([
                'is_read' => true,
                'read_at' => now(),
            ]);
        } else {
            Notification::where('user_id', $user->id)
                ->where('is_read', false)
                ->update([
                    'is_read' => true,
                    'read_at' => now(),
                ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Todas las notificaciones marcadas como leídas',
        ]);
    }

    /**
     * Delete notification.
     */
    public function destroy(Notification $notification): JsonResponse
    {
        if ($notification->user_id !== Auth::id()) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notificación eliminada',
        ]);
    }
}
