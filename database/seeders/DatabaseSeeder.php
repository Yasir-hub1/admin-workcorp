<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Area;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed roles and permissions first
        $this->call(RolePermissionSeeder::class);

        // Create sample areas
        $areaVentas = Area::create([
            'name' => 'Ventas',
            'code' => 'VEN',
            'description' => 'Área de Ventas y Comercial',
            'is_active' => true,
            'budget_monthly' => 50000.00,
            'budget_annual' => 600000.00,
            'order' => 1,
        ]);

        $areaRRHH = Area::create([
            'name' => 'Recursos Humanos',
            'code' => 'RRHH',
            'description' => 'Área de Recursos Humanos',
            'is_active' => true,
            'budget_monthly' => 30000.00,
            'budget_annual' => 360000.00,
            'order' => 2,
        ]);

        $areaTI = Area::create([
            'name' => 'Tecnología de la Información',
            'code' => 'TI',
            'description' => 'Área de Tecnología e Informática',
            'is_active' => true,
            'budget_monthly' => 40000.00,
            'budget_annual' => 480000.00,
            'order' => 3,
        ]);

        $areaAdmin = Area::create([
            'name' => 'Administración',
            'code' => 'ADM',
            'description' => 'Área Administrativa',
            'is_active' => true,
            'budget_monthly' => 35000.00,
            'budget_annual' => 420000.00,
            'order' => 4,
        ]);

        // Create Super Admin user
        $admin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@workcorp.com',
            'password' => Hash::make('password'),
            'is_active' => true,
            'language' => 'es',
            'timezone' => 'America/Lima',
        ]);

        // Assign super_admin role
        $admin->assignRole('super_admin');

        $this->command->info('✅ Super Admin creado: admin@workcorp.com / password');
        $this->command->info('   - Rol: Super Administrador');
        $this->command->info('   - Permisos: TODOS (' . \App\Models\Permission::count() . ' permisos)');

        // Create Jefe de Área user
        $jefe = User::create([
            'name' => 'Jefe de Área Test',
            'email' => 'jefe@workcorp.com',
            'password' => Hash::make('password'),
            'is_active' => true,
            'area_id' => $areaVentas->id,
            'language' => 'es',
            'timezone' => 'America/Lima',
        ]);
        $jefe->assignRole('jefe_area');

        // Asignar como manager del área
        $areaVentas->update(['manager_id' => $jefe->id]);

        $this->command->info('✅ Jefe de Área creado: jefe@workcorp.com / password');
        $this->command->info('   - Rol: Jefe de Área');
        $this->command->info('   - Área: ' . $areaVentas->name);

        // Create Personal user
        $empleado = User::create([
            'name' => 'Personal Test',
            'email' => 'personal@workcorp.com',
            'password' => Hash::make('password'),
            'is_active' => true,
            'area_id' => $areaVentas->id,
            'language' => 'es',
            'timezone' => 'America/Lima',
        ]);
        $empleado->assignRole('personal');

        $this->command->info('✅ Personal creado: personal@workcorp.com / password');
        $this->command->info('   - Rol: Personal');
        $this->command->info('   - Área: ' . $areaVentas->name);

        // Create additional test users
        $empleado2 = User::create([
            'name' => 'Empleado RRHH',
            'email' => 'empleado@workcorp.com',
            'password' => Hash::make('password'),
            'is_active' => true,
            'area_id' => $areaRRHH->id,
            'language' => 'es',
            'timezone' => 'America/Lima',
        ]);
        $empleado2->assignRole('personal');

        $jefeTI = User::create([
            'name' => 'Jefe de TI',
            'email' => 'jefe.ti@workcorp.com',
            'password' => Hash::make('password'),
            'is_active' => true,
            'area_id' => $areaTI->id,
            'language' => 'es',
            'timezone' => 'America/Lima',
        ]);
        $jefeTI->assignRole('jefe_area');
        $areaTI->update(['manager_id' => $jefeTI->id]);

        $this->command->info('');
        $this->command->info('✅ Usuarios de prueba creados exitosamente!');
        $this->command->info('');
        $this->command->info('📋 Resumen de usuarios:');
        $this->command->info('   Super Admin: admin@workcorp.com / password');
        $this->command->info('   Jefe de Área (Ventas): jefe@workcorp.com / password');
        $this->command->info('   Personal (Ventas): personal@workcorp.com / password');
        $this->command->info('   Personal (RRHH): empleado@workcorp.com / password');
        $this->command->info('   Jefe de TI: jefe.ti@workcorp.com / password');
        $this->command->info('');
        $this->command->info('📁 Áreas creadas:');
        $this->command->info('   - Ventas (VEN)');
        $this->command->info('   - Recursos Humanos (RRHH)');
        $this->command->info('   - Tecnología de la Información (TI)');
        $this->command->info('   - Administración (ADM)');
    }
}
