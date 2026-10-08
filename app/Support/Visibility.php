<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

final class Visibility
{
    public static function areaId(User $user): ?int
    {
        if ($user->area_id) {
            return (int) $user->area_id;
        }

        if (! $user->relationLoaded('staff')) {
            $user->load('staff');
        }

        $staffAreaId = $user->staff?->area_id;

        return $staffAreaId ? (int) $staffAreaId : null;
    }

    public static function seesAll(User $user, string $module = ''): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        if ($module === 'reports') {
            return $user->hasPermission('reports.view-all') || $user->hasPermission('reports.view-area');
        }

        return self::areaId($user) === null && $user->hasPermission($module.'.view-all');
    }

    public static function seesArea(User $user, string $module): bool
    {
        if ($user->hasPermission($module.'.view-area')) {
            return true;
        }

        if ($module === 'staff' && $user->hasPermission('staff.view-own')) {
            return true;
        }

        return $user->isJefeArea();
    }

    /**
     * Recorta el listado al área del usuario autenticado.
     * Super admin ve todo. Quien tiene área nunca ve otras áreas.
     */
    public static function apply(
        Builder $query,
        User $user,
        string $module,
        ?string $ownColumn = null,
        string $areaColumn = 'area_id',
    ): Builder {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        $areaId = self::areaId($user);
        if ($areaId !== null) {
            return $query->where($areaColumn, $areaId);
        }

        if ($ownColumn !== null) {
            return $query->where($ownColumn, $user->id);
        }

        if ($user->hasPermission($module.'.view-all')) {
            return $query;
        }

        return $query->whereRaw('0 = 1');
    }

    public static function applyWithClientArea(
        Builder $query,
        User $user,
        string $module,
        ?string $ownColumn = 'assigned_to',
    ): Builder {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        $areaId = self::areaId($user);
        if ($areaId !== null) {
            return $query->where(function (Builder $q) use ($areaId): void {
                $q->where('area_id', $areaId)
                    ->orWhereHas('client', fn (Builder $client) => $client->where('area_id', $areaId));
            });
        }

        if ($ownColumn !== null) {
            return $query->where($ownColumn, $user->id);
        }

        if ($user->hasPermission($module.'.view-all')) {
            return $query;
        }

        return $query->whereRaw('0 = 1');
    }

    public static function constrainByArea(Builder $query, User $user, string $module, string $column = 'area_id'): Builder
    {
        return self::apply($query, $user, $module, null, $column);
    }

    public static function constrainUsers(Builder $query, User $user, bool $lookup = false): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        $areaId = self::areaId($user);
        if ($areaId !== null) {
            return $query->where(function (Builder $q) use ($areaId): void {
                $q->where('area_id', $areaId)
                    ->orWhereHas('staff', fn (Builder $staff) => $staff->where('area_id', $areaId));
            });
        }

        if ($lookup || $user->hasPermission('users.view')) {
            return $query;
        }

        return $query->where('id', $user->id);
    }

    public static function constrainStaff(Builder $query, User $user, bool $lookup = false): Builder
    {
        if ($user->isSuperAdmin() || self::seesAll($user, 'staff')) {
            return $query;
        }

        $areaId = self::areaId($user);

        if ($lookup || self::seesArea($user, 'staff') || $areaId !== null) {
            if ($areaId !== null) {
                return $query->where('area_id', $areaId);
            }

            return $query->where('user_id', $user->id);
        }

        return $query->where('user_id', $user->id);
    }

    public static function constrainAreas(Builder $query, User $user): Builder
    {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        $areaId = self::areaId($user);
        if ($areaId !== null) {
            return $query->where('id', $areaId);
        }

        if ($user->hasPermission('areas.view')) {
            return $query;
        }

        return $query->whereRaw('0 = 1');
    }

    public static function constrainReports(Builder $query, User $user, string $column = 'area_id'): Builder
    {
        return $query;
    }

    public static function constrainByRelatedUserArea(
        Builder $query,
        User $user,
        string $module,
        string $userIdColumn = 'user_id',
        string $userRelation = 'user',
    ): Builder {
        if ($user->isSuperAdmin()) {
            return $query;
        }

        $areaId = self::areaId($user);

        if ($areaId !== null) {
            return $query->whereHas($userRelation, function (Builder $q) use ($areaId): void {
                $q->where('area_id', $areaId)
                    ->orWhereHas('staff', fn (Builder $staff) => $staff->where('area_id', $areaId));
            });
        }

        return $query->where($userIdColumn, $user->id);
    }

    public static function recordIsOutsideArea(User $user, mixed $recordAreaId): bool
    {
        if ($user->isSuperAdmin()) {
            return false;
        }

        $areaId = self::areaId($user);
        if ($areaId === null) {
            return false;
        }

        return (int) $recordAreaId !== (int) $areaId;
    }

    public static function requestedAreaId(User $user, mixed $requestedAreaId): ?int
    {
        if ($requestedAreaId === null || $requestedAreaId === '') {
            return null;
        }

        $requested = (int) $requestedAreaId;
        $own = self::areaId($user);

        if ($user->isSuperAdmin() || $user->hasPermission('reports.view-all') || $user->hasPermission('reports.view-area')) {
            return $requested;
        }

        if ($own !== null) {
            return $own === $requested ? $requested : $own;
        }

        if ($user->hasPermission('reports.view-all') || $user->hasPermission('areas.view')) {
            return $requested;
        }

        return $own;
    }
}
