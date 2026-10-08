<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\Attendance\AttendanceMetricsCalculator;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use PHPUnit\Framework\TestCase;

final class AttendanceMetricsCalculatorTest extends TestCase
{
    private AttendanceMetricsCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new AttendanceMetricsCalculator;
    }

    public function test_late_arrival_against_registered_shift(): void
    {
        $shift = [
            'start' => Carbon::parse('2026-10-08 09:00:00'),
            'end' => Carbon::parse('2026-10-08 18:00:00'),
        ];
        $records = $this->records([
            ['check_in', '2026-10-08 10:00:00'],
            ['check_out', '2026-10-08 18:00:00'],
        ]);

        $metrics = $this->calculator->calculate($records, $shift);

        $this->assertSame(60, $metrics->lateMinutes);
        $this->assertTrue($metrics->isLate);
        $this->assertSame(0, $metrics->overtimeMinutes);
        $this->assertSame(0, $metrics->earlyLeaveMinutes);
        $this->assertSame(480, $metrics->workedMinutes);
        $this->assertSame(540, $metrics->scheduledMinutes);
    }

    public function test_early_leave_and_overtime_against_registered_shift(): void
    {
        $shift = [
            'start' => Carbon::parse('2026-10-08 09:00:00'),
            'end' => Carbon::parse('2026-10-08 18:00:00'),
        ];

        $early = $this->calculator->calculate(
            $this->records([
                ['check_in', '2026-10-08 09:00:00'],
                ['check_out', '2026-10-08 17:00:00'],
            ]),
            $shift,
        );
        $this->assertSame(60, $early->earlyLeaveMinutes);
        $this->assertSame(0, $early->overtimeMinutes);

        $overtime = $this->calculator->calculate(
            $this->records([
                ['check_in', '2026-10-08 09:00:00'],
                ['check_out', '2026-10-08 19:30:00'],
            ]),
            $shift,
        );
        $this->assertSame(90, $overtime->overtimeMinutes);
        $this->assertSame(0, $overtime->earlyLeaveMinutes);
        $this->assertSame(0, $overtime->lateMinutes);
    }

    /**
     * @param  array<int, array{0: string, 1: string}>  $items
     */
    private function records(array $items): Collection
    {
        return collect($items)->map(fn (array $item) => (object) [
            'type' => $item[0],
            'timestamp' => Carbon::parse($item[1]),
        ]);
    }
}
