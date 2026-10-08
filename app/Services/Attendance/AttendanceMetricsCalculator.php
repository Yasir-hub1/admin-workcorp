<?php

declare(strict_types=1);

namespace App\Services\Attendance;

use App\DTO\Attendance\AttendanceMetrics;
use App\Models\Attendance;
use App\Models\AttendanceRecord;
use App\Models\Schedule;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

final class AttendanceMetricsCalculator
{
    private const WEEKDAY_KEYS = [
        Carbon::MONDAY => 'monday',
        Carbon::TUESDAY => 'tuesday',
        Carbon::WEDNESDAY => 'wednesday',
        Carbon::THURSDAY => 'thursday',
        Carbon::FRIDAY => 'friday',
        Carbon::SATURDAY => 'saturday',
        Carbon::SUNDAY => 'sunday',
    ];

    /**
     * @param  Collection<int, Attendance>  $attendances
     * @return Collection<int, Attendance>
     */
    public function hydrateCollection(Collection $attendances): Collection
    {
        if ($attendances->isEmpty()) {
            return $attendances;
        }

        $userIds = $attendances->pluck('user_id')->unique()->filter()->values();
        $months = $attendances
            ->map(fn (Attendance $attendance) => Carbon::parse($attendance->date)->startOfMonth()->toDateString())
            ->unique()
            ->values();

        $schedulesByUser = Schedule::query()
            ->whereIn('user_id', $userIds)
            ->whereIn('month', $months)
            ->get()
            ->groupBy('user_id');

        foreach ($attendances as $attendance) {
            $metrics = $this->forAttendance(
                $attendance,
                $this->pickSchedule($schedulesByUser->get($attendance->user_id, collect()), $attendance->date),
            );
            $this->applyMetrics($attendance, $metrics);
        }

        return $attendances;
    }

    public function forAttendance(Attendance $attendance, ?Schedule $schedule = null): AttendanceMetrics
    {
        $date = $attendance->date instanceof CarbonInterface
            ? $attendance->date
            : Carbon::parse($attendance->date);

        $records = $attendance->relationLoaded('records')
            ? $attendance->records
            : $attendance->records()->orderBy('timestamp')->get();

        $user = $attendance->relationLoaded('user') ? $attendance->user : $attendance->user()->first();

        if ($schedule === null && $user) {
            $schedule = $this->scheduleForDate($user, $date);
        }

        return $this->calculate($records, $this->shiftFromSchedule($schedule, $date, $user));
    }

    /**
     * @param  Collection<int, AttendanceRecord>  $records
     * @param  array{start: CarbonInterface, end: CarbonInterface}|null  $shift
     */
    public function calculate(Collection $records, ?array $shift): AttendanceMetrics
    {
        $sorted = $records->sortBy(fn ($record) => $record->timestamp?->timestamp ?? 0)->values();
        $workedMinutes = $this->workedMinutes($sorted);

        if ($shift === null) {
            $overtime = max(0, $workedMinutes - 480);

            return new AttendanceMetrics(
                workedMinutes: $workedMinutes,
                scheduledMinutes: 0,
                lateMinutes: 0,
                earlyLeaveMinutes: 0,
                overtimeMinutes: $overtime,
                isLate: false,
                isAbsent: $sorted->isEmpty(),
            );
        }

        $scheduledMinutes = max(0, (int) round($shift['start']->diffInMinutes($shift['end'])));
        $firstCheckIn = $sorted->first(fn ($record) => $record->type === 'check_in');
        $lastCheckOut = $sorted->reverse()->first(fn ($record) => $record->type === 'check_out');

        $lateMinutes = 0;
        if ($firstCheckIn?->timestamp) {
            $checkIn = Carbon::parse($firstCheckIn->timestamp);
            if ($checkIn->greaterThan($shift['start'])) {
                $lateMinutes = (int) round($shift['start']->diffInMinutes($checkIn));
            }
        }

        $earlyLeaveMinutes = 0;
        $overtimeMinutes = 0;
        if ($lastCheckOut?->timestamp) {
            $checkOut = Carbon::parse($lastCheckOut->timestamp);
            if ($checkOut->lessThan($shift['end'])) {
                $earlyLeaveMinutes = (int) round($checkOut->diffInMinutes($shift['end']));
            } elseif ($checkOut->greaterThan($shift['end'])) {
                $overtimeMinutes = (int) round($shift['end']->diffInMinutes($checkOut));
            }
        }

        return new AttendanceMetrics(
            workedMinutes: $workedMinutes,
            scheduledMinutes: $scheduledMinutes,
            lateMinutes: $lateMinutes,
            earlyLeaveMinutes: $earlyLeaveMinutes,
            overtimeMinutes: $overtimeMinutes,
            isLate: $lateMinutes > 0,
            isAbsent: $sorted->isEmpty(),
        );
    }

    public function scheduleForDate(User $user, CarbonInterface $date): ?Schedule
    {
        $month = $date->copy()->startOfMonth()->toDateString();
        $schedules = Schedule::query()
            ->where('user_id', $user->id)
            ->whereDate('month', $month)
            ->get();

        return $this->pickSchedule($schedules, $date);
    }

    /**
     * @param  Collection<int, Schedule>  $schedules
     */
    private function pickSchedule(Collection $schedules, mixed $date): ?Schedule
    {
        $month = Carbon::parse($date)->startOfMonth()->toDateString();
        $forMonth = $schedules->filter(function (Schedule $schedule) use ($month): bool {
            $scheduleMonth = Carbon::parse($schedule->month)->startOfMonth()->toDateString();

            return $scheduleMonth === $month;
        });

        return $forMonth->firstWhere('is_approved', true) ?? $forMonth->first();
    }

    /**
     * @return array{start: CarbonInterface, end: CarbonInterface}|null
     */
    private function shiftFromSchedule(?Schedule $schedule, CarbonInterface $date, ?User $user): ?array
    {
        if ($schedule === null) {
            return null;
        }

        $key = self::WEEKDAY_KEYS[$date->dayOfWeek] ?? null;
        $day = is_array($schedule->schedule_data) ? ($schedule->schedule_data[$key] ?? null) : null;

        if (! is_array($day) || empty($day['enabled']) || empty($day['start_time']) || empty($day['end_time'])) {
            return null;
        }

        $timezone = $user?->timezone ?: config('app.timezone', 'America/La_Paz');
        $start = Carbon::parse($date->toDateString().' '.$day['start_time'], $timezone);
        $end = Carbon::parse($date->toDateString().' '.$day['end_time'], $timezone);

        if ($end->lessThanOrEqualTo($start)) {
            $end->addDay();
        }

        return ['start' => $start, 'end' => $end];
    }

    /**
     * @param  Collection<int, AttendanceRecord>  $records
     */
    private function workedMinutes(Collection $records): int
    {
        $totalMinutes = 0;
        $checkInTime = null;

        foreach ($records as $record) {
            if ($record->type === 'check_in') {
                if ($checkInTime) {
                    $totalMinutes += (int) round($checkInTime->diffInMinutes($record->timestamp));
                }
                $checkInTime = Carbon::parse($record->timestamp);
            } elseif ($record->type === 'check_out' && $checkInTime) {
                $totalMinutes += (int) round($checkInTime->diffInMinutes($record->timestamp));
                $checkInTime = null;
            }
        }

        return $totalMinutes;
    }

    private function applyMetrics(Attendance $attendance, AttendanceMetrics $metrics): void
    {
        $attendance->setAttribute('total_minutes', $metrics->workedMinutes);
        $attendance->setAttribute('late_minutes', $metrics->lateMinutes);
        $attendance->setAttribute('overtime_minutes', $metrics->overtimeMinutes);
        $attendance->setAttribute('is_late', $metrics->isLate);
        $attendance->setAttribute('early_leave_minutes', $metrics->earlyLeaveMinutes);
        $attendance->setAttribute('scheduled_minutes', $metrics->scheduledMinutes);
    }
}
