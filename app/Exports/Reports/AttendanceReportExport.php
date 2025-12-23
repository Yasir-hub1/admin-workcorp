<?php

namespace App\Exports\Reports;

use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class AttendanceReportExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private array $filters = [])
    {
    }

    public function collection(): Collection
    {
        $groupBy = $this->filters['group_by'] ?? 'day';
        if (!in_array($groupBy, ['day', 'week', 'month'], true)) {
            $groupBy = 'day';
        }

        $startDate = $this->filters['start_date'] ?? now()->startOfMonth()->toDateString();
        $endDate = $this->filters['end_date'] ?? now()->endOfMonth()->toDateString();

        $q = Attendance::query()
            ->with(['user'])
            ->whereBetween('date', [$startDate, $endDate]);

        if (!empty($this->filters['user_id'])) {
            $q->where('user_id', $this->filters['user_id']);
        }

        if (!empty($this->filters['area_id'])) {
            $areaId = (int) $this->filters['area_id'];
            $q->whereHas('user', fn ($qq) => $qq->where('area_id', $areaId));
        }

        $attendances = $q->orderBy('date')->get();

        $rows = $attendances
            ->groupBy(function (Attendance $a) use ($groupBy) {
                $date = $a->date instanceof Carbon ? $a->date : Carbon::parse($a->date);
                if ($groupBy === 'week') {
                    return $date->isoFormat('GGGG-[W]WW');
                }
                if ($groupBy === 'month') {
                    return $date->format('Y-m');
                }
                return $date->format('Y-m-d');
            })
            ->flatMap(function ($bucket, $periodKey) use ($groupBy) {
                return $bucket->groupBy('user_id')->map(function ($items) use ($periodKey, $groupBy) {
                    $first = $items->first();
                    $user = $first?->user;
                    $minutes = (int) $items->sum('total_minutes');
                    $overtime = (int) $items->sum('overtime_minutes');
                    $late = (int) $items->sum('late_minutes');
                    $daysWorked = (int) $items->filter(fn (Attendance $a) => (int) $a->total_minutes > 0)->count();
                    $absentDays = (int) $items->filter(fn (Attendance $a) => (bool) $a->is_absent)->count();

                    [$start, $end] = $this->periodRange($periodKey, $groupBy);

                    return [
                        'user_name' => $user?->name,
                        'period_type' => $groupBy,
                        'period_key' => $periodKey,
                        'period_start' => $start,
                        'period_end' => $end,
                        'days_worked' => $daysWorked,
                        'absent_days' => $absentDays,
                        'total_minutes' => $minutes,
                        'total_hours' => round($minutes / 60, 2),
                        'overtime_minutes' => $overtime,
                        'overtime_hours' => round($overtime / 60, 2),
                        'late_minutes' => $late,
                        'late_hours' => round($late / 60, 2),
                    ];
                })->values();
            })
            ->sortBy([
                ['user_name', 'asc'],
                ['period_key', 'asc'],
            ])
            ->values();

        return $rows;
    }

    public function headings(): array
    {
        return [
            'Personal',
            'Tipo período',
            'Período',
            'Inicio',
            'Fin',
            'Días trabajados',
            'Días ausente',
            'Minutos trabajados',
            'Horas trabajadas',
            'Minutos extra',
            'Horas extra',
            'Minutos tarde',
            'Horas tarde',
        ];
    }

    public function map($row): array
    {
        return [
            $row['user_name'],
            $row['period_type'],
            $row['period_key'],
            $row['period_start'],
            $row['period_end'],
            $row['days_worked'],
            $row['absent_days'],
            $row['total_minutes'],
            $row['total_hours'],
            $row['overtime_minutes'],
            $row['overtime_hours'],
            $row['late_minutes'],
            $row['late_hours'],
        ];
    }

    private function periodRange(string $key, string $groupBy): array
    {
        if ($groupBy === 'week') {
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

        return [$key, $key];
    }
}


