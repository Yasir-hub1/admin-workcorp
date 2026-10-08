<?php

declare(strict_types=1);

namespace App\Services\Staff;

use App\Models\Schedule;
use App\Models\User;
use App\Support\Visibility;
use Illuminate\Auth\Access\AuthorizationException;

final class ScheduleAssignmentService
{
    public function resolveTargetUserId(User $actor, ?int $requestedUserId): int
    {
        $requested = $requestedUserId ?: (int) $actor->id;

        if ($requested === (int) $actor->id) {
            return (int) $actor->id;
        }

        if ($actor->isSuperAdmin()) {
            return $requested;
        }

        if (! $this->canManageAreaSchedules($actor)) {
            throw new AuthorizationException('Solo puedes crear tu propio horario');
        }

        $target = User::query()->with('staff')->find($requested);
        if (! $target) {
            throw new AuthorizationException('El personal seleccionado no existe');
        }

        if (! $this->sharesArea($actor, $target)) {
            throw new AuthorizationException('Solo puedes crear horarios del personal de tu área');
        }

        return $requested;
    }

    public function canManageAreaSchedules(User $actor): bool
    {
        return $actor->isJefeArea() || $actor->hasPermission('schedules.view-area');
    }

    public function canManageSchedule(User $actor, Schedule $schedule): bool
    {
        if ($actor->isSuperAdmin() || (int) $schedule->user_id === (int) $actor->id) {
            return true;
        }

        if (! $this->canManageAreaSchedules($actor)) {
            return false;
        }

        $schedule->loadMissing('user.staff');

        return $schedule->user instanceof User && $this->sharesArea($actor, $schedule->user);
    }

    public function canEditApprovedSchedule(User $actor): bool
    {
        return $actor->isSuperAdmin() || $this->canManageAreaSchedules($actor);
    }

    private function sharesArea(User $actor, User $target): bool
    {
        $actorArea = Visibility::areaId($actor);
        $targetArea = Visibility::areaId($target);

        return $actorArea !== null && $targetArea !== null && (int) $actorArea === (int) $targetArea;
    }
}
