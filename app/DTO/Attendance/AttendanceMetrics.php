<?php

declare(strict_types=1);

namespace App\DTO\Attendance;

final readonly class AttendanceMetrics
{
    public function __construct(
        public int $workedMinutes,
        public int $scheduledMinutes,
        public int $lateMinutes,
        public int $earlyLeaveMinutes,
        public int $overtimeMinutes,
        public bool $isLate,
        public bool $isAbsent,
    ) {}
}
