<?php

namespace App\Traits;

use App\Models\Permission;
use Illuminate\Support\Collection;

trait HasPermissions
{
    /**
     * Get all permissions for the user through their roles.
     */
    public function permissions(): Collection
    {
        // Super admins have all permissions
        if ($this->isSuperAdmin()) {
            return Permission::all();
        }

        return $this->roles->flatMap(function ($role) {
            return $role->permissions;
        })->unique('id');
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        // Super admins have all permissions
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->permissions()->contains('name', $permission);
    }

    /**
     * Check if user has any of the given permissions.
     */
    public function hasAnyPermission(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if ($this->hasPermission($permission)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has all of the given permissions.
     */
    public function hasAllPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->hasPermission($permission)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get permission names for the user.
     */
    public function getPermissionNames(): Collection
    {
        // Super admins have all permissions
        if ($this->isSuperAdmin()) {
            return Permission::pluck('name');
        }

        return $this->permissions()->pluck('name');
    }

    /**
     * Check if user can access a specific module.
     */
    public function canAccessModule(string $module): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->permissions()
            ->where('module', $module)
            ->isNotEmpty();
    }

    /**
     * Get all modules the user can access.
     */
    public function getAccessibleModules(): Collection
    {
        if ($this->isSuperAdmin()) {
            return collect([
                'users', 'areas', 'staff', 'attendance', 'requests',
                'meetings', 'assets', 'expenses', 'clients', 'services',
                'inventory', 'tickets', 'notifications', 'reports'
            ]);
        }

        return $this->permissions()->pluck('module')->unique();
    }
}
