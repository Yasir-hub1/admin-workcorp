<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $role = DB::table('roles')->where('name', 'jefe_area')->first();
        $permission = DB::table('permissions')->where('name', 'schedules.edit')->first();

        if (! $role || ! $permission) {
            return;
        }

        $exists = DB::table('role_permission')
            ->where('role_id', $role->id)
            ->where('permission_id', $permission->id)
            ->exists();

        if ($exists) {
            return;
        }

        DB::table('role_permission')->insert([
            'role_id' => $role->id,
            'permission_id' => $permission->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        $role = DB::table('roles')->where('name', 'jefe_area')->first();
        $permission = DB::table('permissions')->where('name', 'schedules.edit')->first();

        if (! $role || ! $permission) {
            return;
        }

        DB::table('role_permission')
            ->where('role_id', $role->id)
            ->where('permission_id', $permission->id)
            ->delete();
    }
};
