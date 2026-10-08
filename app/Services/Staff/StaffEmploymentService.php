<?php

declare(strict_types=1);

namespace App\Services\Staff;

use App\Models\Staff;
use App\Models\User;

final class StaffEmploymentService
{
    public function isActive(Staff $staff): bool
    {
        if (! $staff->is_active) {
            return false;
        }

        if ($staff->termination_date && $staff->termination_date->lte(now()->startOfDay())) {
            return false;
        }

        return true;
    }

    public function syncLinkedUser(Staff $staff): void
    {
        if (! $staff->user_id) {
            return;
        }

        /** @var User|null $user */
        $user = $staff->user ?? User::query()->find($staff->user_id);
        if (! $user) {
            return;
        }

        $active = $this->isActive($staff);

        $user->update(['is_active' => $active]);

        if (! $active) {
            $user->tokens()->delete();
        }

        if ($staff->area_id && (int) $user->area_id !== (int) $staff->area_id) {
            $user->update(['area_id' => $staff->area_id]);
        }
    }
}
