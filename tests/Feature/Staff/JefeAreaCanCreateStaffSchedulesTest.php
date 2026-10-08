<?php

declare(strict_types=1);

namespace Tests\Feature\Staff;

use App\Models\Area;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class JefeAreaCanCreateStaffSchedulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_jefe_area_can_create_schedule_for_staff_in_their_area(): void
    {
        [$jefe, $staff] = $this->jefeAndStaffInSameArea();

        Sanctum::actingAs($jefe);

        $response = $this->postJson('/api/v1/schedules', [
            'user_id' => $staff->id,
            'month' => '2026-10',
            'schedule_data' => [
                'monday' => ['enabled' => true, 'start_time' => '09:00', 'end_time' => '18:00'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user_id', $staff->id);

        $this->assertDatabaseHas('schedules', [
            'user_id' => $staff->id,
            'month' => '2026-10-01',
        ]);
    }

    public function test_jefe_area_cannot_create_schedule_for_staff_in_another_area(): void
    {
        [$jefe] = $this->jefeAndStaffInSameArea();
        $otherArea = Area::query()->create([
            'name' => 'Otra',
            'code' => 'OTRA',
        ]);
        $outsider = User::factory()->create(['area_id' => $otherArea->id]);

        Sanctum::actingAs($jefe);

        $this->postJson('/api/v1/schedules', [
            'user_id' => $outsider->id,
            'month' => '2026-10',
            'schedule_data' => [
                'monday' => ['enabled' => true, 'start_time' => '09:00', 'end_time' => '18:00'],
            ],
        ])->assertForbidden();

        $this->assertDatabaseMissing('schedules', [
            'user_id' => $outsider->id,
        ]);
    }

    public function test_personal_cannot_create_schedule_for_another_user(): void
    {
        $area = Area::query()->create(['name' => 'Sistemas', 'code' => 'SIS']);
        $personalRole = $this->roleWithPermissions('personal', ['schedules.create', 'schedules.view-own']);
        $actor = User::factory()->create(['area_id' => $area->id]);
        $actor->roles()->attach($personalRole->id, ['assigned_at' => now()]);
        $actor->refresh()->load('roles.permissions');
        $peer = User::factory()->create(['area_id' => $area->id]);

        Sanctum::actingAs($actor);

        $this->postJson('/api/v1/schedules', [
            'user_id' => $peer->id,
            'month' => '2026-10',
            'schedule_data' => [
                'monday' => ['enabled' => true, 'start_time' => '09:00', 'end_time' => '18:00'],
            ],
        ])->assertForbidden();

        $this->assertDatabaseMissing('schedules', [
            'user_id' => $peer->id,
        ]);
    }

    public function test_jefe_area_can_update_schedule_of_area_staff(): void
    {
        [$jefe, $staff] = $this->jefeAndStaffInSameArea();
        $schedule = Schedule::query()->create([
            'user_id' => $staff->id,
            'month' => '2026-10-01',
            'schedule_data' => [
                'monday' => ['enabled' => true, 'start_time' => '08:00', 'end_time' => '17:00'],
            ],
            'is_approved' => false,
        ]);

        Sanctum::actingAs($jefe);

        $this->putJson("/api/v1/schedules/{$schedule->id}", [
            'schedule_data' => [
                'monday' => ['enabled' => true, 'start_time' => '09:00', 'end_time' => '18:00'],
            ],
        ])->assertOk();
    }

    /**
     * @return array{0: User, 1: User}
     */
    private function jefeAndStaffInSameArea(): array
    {
        $area = Area::query()->create([
            'name' => 'Sistemas',
            'code' => 'SIS',
        ]);

        $jefeRole = $this->roleWithPermissions('jefe_area', [
            'schedules.create',
            'schedules.edit',
            'schedules.view-area',
        ]);

        $jefe = User::factory()->create(['area_id' => $area->id]);
        $jefe->roles()->attach($jefeRole->id, ['assigned_at' => now()]);
        $jefe->refresh()->load('roles.permissions');

        $staff = User::factory()->create(['area_id' => $area->id]);

        return [$jefe, $staff];
    }

    /**
     * @param  list<string>  $permissionNames
     */
    private function roleWithPermissions(string $name, array $permissionNames): Role
    {
        $role = Role::query()->create([
            'name' => $name,
            'display_name' => $name,
            'level' => $name === 'jefe_area' ? 2 : 3,
        ]);

        foreach ($permissionNames as $permissionName) {
            $permission = Permission::query()->firstOrCreate(
                ['name' => $permissionName],
                ['module' => 'schedules', 'display_name' => $permissionName],
            );
            $role->permissions()->attach($permission->id);
        }

        return $role;
    }
}
