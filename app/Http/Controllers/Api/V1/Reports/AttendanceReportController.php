<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
}


