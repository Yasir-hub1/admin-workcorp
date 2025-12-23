<?php

namespace App\Http\Resources\V1\User;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'profile_photo_path' => $this->profile_photo_path,
            'is_active' => $this->is_active,
            'language' => $this->language,
            'timezone' => $this->timezone,
            'last_login_at' => $this->last_login_at?->toISOString(),
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),

            // Roles and Permissions
            'roles' => RoleResource::collection($this->whenLoaded('roles')),
            'role_names' => $this->when($this->relationLoaded('roles'), function () {
                return $this->roles->pluck('name')->toArray();
            }),
            'permissions' => $this->when($this->relationLoaded('roles'), function () {
                return $this->permissions()->pluck('name')->toArray();
            }),
            'permission_names' => $this->when($this->relationLoaded('roles'), function () {
                return $this->permissions()->pluck('name')->toArray();
            }),

            // 2FA Status
            'has_two_factor' => $this->hasTwoFactorEnabled(),

            // Computed attributes
            'is_super_admin' => $this->when($this->relationLoaded('roles'), fn() => $this->isSuperAdmin()),
            'is_jefe_area' => $this->when($this->relationLoaded('roles'), fn() => $this->isJefeArea()),
            'is_personal' => $this->when($this->relationLoaded('roles'), fn() => $this->isPersonal()),

            // Staff relationship
            'staff' => $this->whenLoaded('staff', function () {
                return [
                    'id' => $this->staff->id,
                    'employee_number' => $this->staff->employee_number,
                    'position' => $this->staff->position,
                    'area' => $this->staff->area ? [
                        'id' => $this->staff->area->id,
                        'name' => $this->staff->area->name,
                    ] : null,
                ];
            }),
            'area' => $this->whenLoaded('area', function () {
                return $this->area ? [
                    'id' => $this->area->id,
                    'name' => $this->area->name,
                    'code' => $this->area->code,
                ] : null;
            }),
        ];
    }
}
