<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AttendanceReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $groupBy = $request->get('group_by', 'day'); // day|week|month
        if (!in_array($groupBy, ['day', 'week', 'month'], true)) {
            $groupBy = 'day';
        }

        $startDate = $request->get('start_date', now()->startOfMonth()->toDateString());
        $endDate = $request->get('end_date', now()->endOfMonth()->toDateString());

        $query = Attendance::query()
            ->with(['user'])
            ->whereBetween('date', [$startDate, $endDate]);

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('area_id')) {
            $areaId = (int) $request->area_id;
            $query->whereHas('user', function ($q) use ($areaId) {
                $q->where('area_id', $areaId);
            });
        }

        $attendances = $query->orderBy('date')->get();

        $rows = $attendances
            ->groupBy(function (Attendance $a) use ($groupBy) {
                $date = $a->date instanceof Carbon ? $a->date : Carbon::parse($a->date);
                if ($groupBy === 'week') {
                    return $date->isoFormat('GGGG-[W]WW'); // ISO week key
                }
                if ($groupBy === 'month') {
                    return $date->format('Y-m');
                }
                return $date->format('Y-m-d');
            })
            ->flatMap(function ($bucket, $periodKey) use ($groupBy) {
                /** @var \Illuminate\Support\Collection<int, Attendance> $bucket */
                return $bucket->groupBy('user_id')->map(function ($items) use ($periodKey, $groupBy) {
                    /** @var \Illuminate\Support\Collection<int, Attendance> $items */
                    $first = $items->first();
                    $user = $first?->user;

                    $minutes = (int) $items->sum('total_minutes');
                    $overtimeMinutes = (int) $items->sum('overtime_minutes');
                    $lateMinutes = (int) $items->sum('late_minutes');
                    $daysWorked = (int) $items->filter(fn (Attendance $a) => (int) $a->total_minutes > 0)->count();
                    $absentDays = (int) $items->filter(fn (Attendance $a) => (bool) $a->is_absent)->count();

                    [$periodStart, $periodEnd] = $this->periodRange($periodKey, $groupBy);

                    return [
                        'user_id' => $user?->id,
                        'user_name' => $user?->name,
                        'area_id' => $user?->area_id,
                        'period_key' => $periodKey,
                        'period_type' => $groupBy,
                        'period_start' => $periodStart,
                        'period_end' => $periodEnd,
                        'days_worked' => $daysWorked,
                        'absent_days' => $absentDays,
                        'total_minutes' => $minutes,
                        'total_hours' => round($minutes / 60, 2),
                        'overtime_minutes' => $overtimeMinutes,
                        'overtime_hours' => round($overtimeMinutes / 60, 2),
                        'late_minutes' => $lateMinutes,
                        'late_hours' => round($lateMinutes / 60, 2),
                    ];
                })->values();
            })
            ->sortBy([
                ['user_name', 'asc'],
                ['period_key', 'asc'],
            ])
            ->values();

        $perPage = (int) $request->get('per_page', 15);
        $page = max(1, (int) $request->get('page', 1));
        $total = $rows->count();
        $lastPage = (int) ceil($total / max(1, $perPage));
        $items = $rows->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'success' => true,
            'data' => $items,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    /**
     * Devuelve las marcaciones (AttendanceRecord) con coordenadas para pintar en mapa.
     * Requiere user_id (porque el mapa es por personal).
     */
    public function locations(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $targetUserId = (int) $validated['user_id'];
        $startDate = $validated['start_date'] ?? now()->startOfMonth()->toDateString();
        $endDate = $validated['end_date'] ?? now()->endOfMonth()->toDateString();

        // Seguridad: jefe_area solo puede ver su área. Admin ve todo.
        if (!$user->isSuperAdmin()) {
            if (!$user->hasPermission('reports.view-area') || !$user->area_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }

            $target = User::select('id', 'area_id')->find($targetUserId);
            if (!$target || (int) $target->area_id !== (int) $user->area_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'No autorizado',
                ], 403);
            }
        }

        $records = AttendanceRecord::query()
            ->whereHas('attendance', function ($q) use ($targetUserId, $startDate, $endDate) {
                $q->where('user_id', $targetUserId)
                    ->whereBetween('date', [$startDate, $endDate]);
            })
            ->whereNotNull('location')
            ->orderBy('timestamp')
            ->get(['id', 'attendance_id', 'type', 'mark_reason', 'timestamp', 'location', 'notes']);

        $points = $records->map(function (AttendanceRecord $r) {
            [$lat, $lng] = $this->parseLatLng($r->location);
            if ($lat === null || $lng === null) {
                return null;
            }
            return [
                'id' => $r->id,
                'attendance_id' => $r->attendance_id,
                'type' => $r->type,
                'mark_reason' => $r->mark_reason,
                'timestamp' => $r->timestamp?->toISOString(),
                'location' => $r->location,
                'lat' => $lat,
                'lng' => $lng,
                'notes' => $r->notes,
            ];
        })->filter()->values();

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $targetUserId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'points' => $points,
            ],
        ]);
    }

    private function periodRange(string $key, string $groupBy): array
    {
        if ($groupBy === 'week') {
            // key: GGGG-WWW, ej: 2025-W52
            $parts = explode('-W', $key);
            $year = (int) ($parts[0] ?? 0);
            $week = (int) ($parts[1] ?? 0);
            $start = Carbon::now()->setISODate($year, $week)->startOfWeek(Carbon::MONDAY);
            $end = (clone $start)->endOfWeek(Carbon::SUNDAY);
            return [$start->toDateString(), $end->toDateString()];
        }

        if ($groupBy === 'month') {
            $start = Carbon::createFromFormat('Y-m', $key)->startOfMonth();
            $end = (clone $start)->endOfMonth();
            return [$start->toDateString(), $end->toDateString()];
        }

        // day
        return [$key, $key];
    }

    private function parseLatLng(?string $location): array
    {
        if (!$location) {
            return [null, null];
        }
        $parts = array_map('trim', explode(',', $location));
        if (count($parts) !== 2) {
            return [null, null];
        }
        $lat = is_numeric($parts[0]) ? (float) $parts[0] : null;
        $lng = is_numeric($parts[1]) ? (float) $parts[1] : null;
        if ($lat === null || $lng === null) {
            return [null, null];
        }
        return [$lat, $lng];
    }
}


