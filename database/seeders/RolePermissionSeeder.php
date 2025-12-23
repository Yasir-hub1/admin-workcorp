<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Roles
        $superAdmin = Role::create([
            'name' => 'super_admin',
            'display_name' => 'Super Administrador',
            'description' => 'Acceso total al sistema',
            'level' => 1,
        ]);

        $jefeArea = Role::create([
            'name' => 'jefe_area',
            'display_name' => 'Jefe de Área',
            'description' => 'Gestiona su área y personal asignado',
            'level' => 2,
        ]);

        $personal = Role::create([
            'name' => 'personal',
            'display_name' => 'Personal',
            'description' => 'Empleado del sistema',
            'level' => 3,
        ]);

        // Create Permissions by Module
        $allPermissions = [];

        // ========== USERS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'users.view', 'module' => 'users', 'display_name' => 'Ver Usuarios']);
        $allPermissions[] = Permission::create(['name' => 'users.create', 'module' => 'users', 'display_name' => 'Crear Usuarios']);
        $allPermissions[] = Permission::create(['name' => 'users.edit', 'module' => 'users', 'display_name' => 'Editar Usuarios']);
        $allPermissions[] = Permission::create(['name' => 'users.delete', 'module' => 'users', 'display_name' => 'Eliminar Usuarios']);
        $allPermissions[] = Permission::create(['name' => 'users.assign-roles', 'module' => 'users', 'display_name' => 'Asignar Roles']);

        // ========== AREAS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'areas.view', 'module' => 'areas', 'display_name' => 'Ver Áreas']);
        $allPermissions[] = Permission::create(['name' => 'areas.create', 'module' => 'areas', 'display_name' => 'Crear Áreas']);
        $allPermissions[] = Permission::create(['name' => 'areas.edit', 'module' => 'areas', 'display_name' => 'Editar Áreas']);
        $allPermissions[] = Permission::create(['name' => 'areas.delete', 'module' => 'areas', 'display_name' => 'Eliminar Áreas']);
        $allPermissions[] = Permission::create(['name' => 'areas.manage-budget', 'module' => 'areas', 'display_name' => 'Gestionar Presupuestos']);

        // ========== STAFF MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'staff.view-all', 'module' => 'staff', 'display_name' => 'Ver Todo el Personal']);
        $allPermissions[] = Permission::create(['name' => 'staff.view-own', 'module' => 'staff', 'display_name' => 'Ver Personal de su Área']);
        $allPermissions[] = Permission::create(['name' => 'staff.create', 'module' => 'staff', 'display_name' => 'Crear Personal']);
        $allPermissions[] = Permission::create(['name' => 'staff.edit', 'module' => 'staff', 'display_name' => 'Editar Personal']);
        $allPermissions[] = Permission::create(['name' => 'staff.delete', 'module' => 'staff', 'display_name' => 'Eliminar Personal']);

        // ========== ATTENDANCE MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'attendance.view-all', 'module' => 'attendance', 'display_name' => 'Ver Todas las Asistencias']);
        $allPermissions[] = Permission::create(['name' => 'attendance.view-area', 'module' => 'attendance', 'display_name' => 'Ver Asistencias de su Área']);
        $allPermissions[] = Permission::create(['name' => 'attendance.view-own', 'module' => 'attendance', 'display_name' => 'Ver Mis Asistencias']);
        $allPermissions[] = Permission::create(['name' => 'attendance.clock', 'module' => 'attendance', 'display_name' => 'Marcar Asistencia']);
        $allPermissions[] = Permission::create(['name' => 'attendance.edit', 'module' => 'attendance', 'display_name' => 'Editar Asistencias']);
        $allPermissions[] = Permission::create(['name' => 'attendance.delete', 'module' => 'attendance', 'display_name' => 'Eliminar Asistencias']);

        // ========== REQUESTS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'requests.view-all', 'module' => 'requests', 'display_name' => 'Ver Todas las Solicitudes']);
        $allPermissions[] = Permission::create(['name' => 'requests.view-area', 'module' => 'requests', 'display_name' => 'Ver Solicitudes de su Área']);
        $allPermissions[] = Permission::create(['name' => 'requests.view-own', 'module' => 'requests', 'display_name' => 'Ver Mis Solicitudes']);
        $allPermissions[] = Permission::create(['name' => 'requests.create', 'module' => 'requests', 'display_name' => 'Crear Solicitudes']);
        $allPermissions[] = Permission::create(['name' => 'requests.edit', 'module' => 'requests', 'display_name' => 'Editar Solicitudes']);
        $allPermissions[] = Permission::create(['name' => 'requests.approve', 'module' => 'requests', 'display_name' => 'Aprobar Solicitudes']);
        $allPermissions[] = Permission::create(['name' => 'requests.reject', 'module' => 'requests', 'display_name' => 'Rechazar Solicitudes']);
        $allPermissions[] = Permission::create(['name' => 'requests.delete', 'module' => 'requests', 'display_name' => 'Eliminar Solicitudes']);

        // ========== SCHEDULES MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'schedules.view-all', 'module' => 'schedules', 'display_name' => 'Ver Todos los Horarios']);
        $allPermissions[] = Permission::create(['name' => 'schedules.view-area', 'module' => 'schedules', 'display_name' => 'Ver Horarios de su Área']);
        $allPermissions[] = Permission::create(['name' => 'schedules.view-own', 'module' => 'schedules', 'display_name' => 'Ver Mis Horarios']);
        $allPermissions[] = Permission::create(['name' => 'schedules.create', 'module' => 'schedules', 'display_name' => 'Crear Horarios']);
        $allPermissions[] = Permission::create(['name' => 'schedules.edit', 'module' => 'schedules', 'display_name' => 'Editar Horarios']);
        $allPermissions[] = Permission::create(['name' => 'schedules.approve', 'module' => 'schedules', 'display_name' => 'Aprobar Horarios']);
        $allPermissions[] = Permission::create(['name' => 'schedules.delete', 'module' => 'schedules', 'display_name' => 'Eliminar Horarios']);

        // ========== MEETINGS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'meetings.view-all', 'module' => 'meetings', 'display_name' => 'Ver Todas las Reuniones']);
        $allPermissions[] = Permission::create(['name' => 'meetings.view-area', 'module' => 'meetings', 'display_name' => 'Ver Reuniones de su Área']);
        $allPermissions[] = Permission::create(['name' => 'meetings.view-own', 'module' => 'meetings', 'display_name' => 'Ver Mis Reuniones']);
        $allPermissions[] = Permission::create(['name' => 'meetings.create', 'module' => 'meetings', 'display_name' => 'Crear Reuniones']);
        $allPermissions[] = Permission::create(['name' => 'meetings.edit', 'module' => 'meetings', 'display_name' => 'Editar Reuniones']);
        $allPermissions[] = Permission::create(['name' => 'meetings.delete', 'module' => 'meetings', 'display_name' => 'Eliminar Reuniones']);

        // ========== EXPENSES MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'expenses.view-all', 'module' => 'expenses', 'display_name' => 'Ver Todos los Gastos']);
        $allPermissions[] = Permission::create(['name' => 'expenses.view-area', 'module' => 'expenses', 'display_name' => 'Ver Gastos de su Área']);
        $allPermissions[] = Permission::create(['name' => 'expenses.view-own', 'module' => 'expenses', 'display_name' => 'Ver Mis Gastos']);
        $allPermissions[] = Permission::create(['name' => 'expenses.create', 'module' => 'expenses', 'display_name' => 'Crear Gastos']);
        $allPermissions[] = Permission::create(['name' => 'expenses.edit', 'module' => 'expenses', 'display_name' => 'Editar Gastos']);
        $allPermissions[] = Permission::create(['name' => 'expenses.delete', 'module' => 'expenses', 'display_name' => 'Eliminar Gastos']);
        $allPermissions[] = Permission::create(['name' => 'expenses.approve-level-1', 'module' => 'expenses', 'display_name' => 'Aprobar Gastos Nivel 1 ($0-$100)']);
        $allPermissions[] = Permission::create(['name' => 'expenses.approve-level-2', 'module' => 'expenses', 'display_name' => 'Aprobar Gastos Nivel 2 ($100-$500)']);
        $allPermissions[] = Permission::create(['name' => 'expenses.approve-level-3', 'module' => 'expenses', 'display_name' => 'Aprobar Gastos Nivel 3 ($500+)']);
        $allPermissions[] = Permission::create(['name' => 'expenses.mark-paid', 'module' => 'expenses', 'display_name' => 'Marcar Gastos como Pagados']);

        // ========== ASSETS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'assets.view-all', 'module' => 'assets', 'display_name' => 'Ver Todos los Activos']);
        $allPermissions[] = Permission::create(['name' => 'assets.view-area', 'module' => 'assets', 'display_name' => 'Ver Activos de su Área']);
        $allPermissions[] = Permission::create(['name' => 'assets.view-own', 'module' => 'assets', 'display_name' => 'Ver Mis Activos']);
        $allPermissions[] = Permission::create(['name' => 'assets.create', 'module' => 'assets', 'display_name' => 'Crear Activos']);
        $allPermissions[] = Permission::create(['name' => 'assets.edit', 'module' => 'assets', 'display_name' => 'Editar Activos']);
        $allPermissions[] = Permission::create(['name' => 'assets.delete', 'module' => 'assets', 'display_name' => 'Eliminar Activos']);
        $allPermissions[] = Permission::create(['name' => 'assets.assign', 'module' => 'assets', 'display_name' => 'Asignar Activos']);
        $allPermissions[] = Permission::create(['name' => 'assets.maintenance', 'module' => 'assets', 'display_name' => 'Gestionar Mantenimientos']);
        $allPermissions[] = Permission::create(['name' => 'assets.depreciate', 'module' => 'assets', 'display_name' => 'Calcular Depreciación']);

        // ========== CLIENTS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'clients.view-all', 'module' => 'clients', 'display_name' => 'Ver Todos los Clientes']);
        $allPermissions[] = Permission::create(['name' => 'clients.view-area', 'module' => 'clients', 'display_name' => 'Ver Clientes de su Área']);
        $allPermissions[] = Permission::create(['name' => 'clients.view-own', 'module' => 'clients', 'display_name' => 'Ver Mis Clientes']);
        $allPermissions[] = Permission::create(['name' => 'clients.create', 'module' => 'clients', 'display_name' => 'Crear Clientes']);
        $allPermissions[] = Permission::create(['name' => 'clients.edit', 'module' => 'clients', 'display_name' => 'Editar Clientes']);
        $allPermissions[] = Permission::create(['name' => 'clients.delete', 'module' => 'clients', 'display_name' => 'Eliminar Clientes']);
        $allPermissions[] = Permission::create(['name' => 'clients.assign', 'module' => 'clients', 'display_name' => 'Asignar Clientes']);

        // ========== SERVICES MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'services.view-all', 'module' => 'services', 'display_name' => 'Ver Todos los Servicios']);
        $allPermissions[] = Permission::create(['name' => 'services.view-area', 'module' => 'services', 'display_name' => 'Ver Servicios de su Área']);
        $allPermissions[] = Permission::create(['name' => 'services.view-own', 'module' => 'services', 'display_name' => 'Ver Mis Servicios']);
        $allPermissions[] = Permission::create(['name' => 'services.create', 'module' => 'services', 'display_name' => 'Crear Servicios']);
        $allPermissions[] = Permission::create(['name' => 'services.edit', 'module' => 'services', 'display_name' => 'Editar Servicios']);
        $allPermissions[] = Permission::create(['name' => 'services.delete', 'module' => 'services', 'display_name' => 'Eliminar Servicios']);
        $allPermissions[] = Permission::create(['name' => 'services.renew', 'module' => 'services', 'display_name' => 'Renovar Servicios']);
        $allPermissions[] = Permission::create(['name' => 'services.assign', 'module' => 'services', 'display_name' => 'Asignar Servicios']);
        $allPermissions[] = Permission::create(['name' => 'services.manage-incidents', 'module' => 'services', 'display_name' => 'Gestionar Incidencias']);

        // ========== INVENTORY MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'inventory.view-all', 'module' => 'inventory', 'display_name' => 'Ver Todo el Inventario']);
        $allPermissions[] = Permission::create(['name' => 'inventory.view-area', 'module' => 'inventory', 'display_name' => 'Ver Inventario de su Área']);
        $allPermissions[] = Permission::create(['name' => 'inventory.create', 'module' => 'inventory', 'display_name' => 'Crear Items de Inventario']);
        $allPermissions[] = Permission::create(['name' => 'inventory.edit', 'module' => 'inventory', 'display_name' => 'Editar Items de Inventario']);
        $allPermissions[] = Permission::create(['name' => 'inventory.delete', 'module' => 'inventory', 'display_name' => 'Eliminar Items de Inventario']);
        $allPermissions[] = Permission::create(['name' => 'inventory.movements', 'module' => 'inventory', 'display_name' => 'Registrar Movimientos']);
        $allPermissions[] = Permission::create(['name' => 'inventory.adjust', 'module' => 'inventory', 'display_name' => 'Ajustar Inventario']);

        // ========== TICKETS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'tickets.view-all', 'module' => 'tickets', 'display_name' => 'Ver Todos los Tickets']);
        $allPermissions[] = Permission::create(['name' => 'tickets.view-area', 'module' => 'tickets', 'display_name' => 'Ver Tickets de su Área']);
        $allPermissions[] = Permission::create(['name' => 'tickets.view-own', 'module' => 'tickets', 'display_name' => 'Ver Mis Tickets']);
        $allPermissions[] = Permission::create(['name' => 'tickets.create', 'module' => 'tickets', 'display_name' => 'Crear Tickets']);
        $allPermissions[] = Permission::create(['name' => 'tickets.edit', 'module' => 'tickets', 'display_name' => 'Editar Tickets']);
        $allPermissions[] = Permission::create(['name' => 'tickets.assign', 'module' => 'tickets', 'display_name' => 'Asignar Tickets']);
        $allPermissions[] = Permission::create(['name' => 'tickets.resolve', 'module' => 'tickets', 'display_name' => 'Resolver Tickets']);
        $allPermissions[] = Permission::create(['name' => 'tickets.delete', 'module' => 'tickets', 'display_name' => 'Eliminar Tickets']);

        // ========== NOTIFICATIONS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'notifications.view', 'module' => 'notifications', 'display_name' => 'Ver Notificaciones']);
        $allPermissions[] = Permission::create(['name' => 'notifications.create', 'module' => 'notifications', 'display_name' => 'Crear Notificaciones']);
        $allPermissions[] = Permission::create(['name' => 'notifications.delete', 'module' => 'notifications', 'display_name' => 'Eliminar Notificaciones']);

        // ========== REPORTS MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'reports.view-all', 'module' => 'reports', 'display_name' => 'Ver Todos los Reportes']);
        $allPermissions[] = Permission::create(['name' => 'reports.view-area', 'module' => 'reports', 'display_name' => 'Ver Reportes de su Área']);
        $allPermissions[] = Permission::create(['name' => 'reports.generate', 'module' => 'reports', 'display_name' => 'Generar Reportes']);
        $allPermissions[] = Permission::create(['name' => 'reports.export', 'module' => 'reports', 'display_name' => 'Exportar Reportes']);

        // ========== SYSTEM MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'system.config', 'module' => 'system', 'display_name' => 'Configurar Sistema']);
        $allPermissions[] = Permission::create(['name' => 'system.audit', 'module' => 'system', 'display_name' => 'Ver Logs de Auditoría']);
        $allPermissions[] = Permission::create(['name' => 'system.backup', 'module' => 'system', 'display_name' => 'Gestionar Respaldos']);

        // ========== ASSIGN PERMISSIONS TO ROLES ==========

        // Super Admin gets ALL permissions explicitly
        $superAdmin->permissions()->attach(
            collect($allPermissions)->pluck('id')->toArray()
        );

        // Jefe de Área permissions
        $jefeAreaPermissions = [
            // Staff
            'staff.view-own', 'staff.create', 'staff.edit',
            // Attendance
            'attendance.view-area', 'attendance.clock', 'attendance.edit',
            // Requests
            'requests.create', 'requests.view-area', 'requests.approve', 'requests.reject',
            // Schedules
            'schedules.view-area', 'schedules.create', 'schedules.approve',
            // Meetings
            'meetings.view-area', 'meetings.create', 'meetings.edit',
            // Expenses
            'expenses.create', 'expenses.view-area', 'expenses.approve-level-1', 'expenses.approve-level-2',
            // Assets
            'assets.view-area', 'assets.create', 'assets.assign', 'assets.maintenance',
            // Clients
            'clients.view-area', 'clients.create', 'clients.edit', 'clients.assign',
            // Services
            'services.view-area', 'services.create', 'services.edit', 'services.assign',
            // Inventory
            'inventory.view-area', 'inventory.create', 'inventory.movements',
            // Tickets
            'tickets.view-area', 'tickets.create', 'tickets.assign', 'tickets.resolve',
            // Notifications
            'notifications.view',
            // Reports
            'reports.view-area', 'reports.generate', 'reports.export',
        ];

        $jefeArea->permissions()->attach(
            Permission::whereIn('name', $jefeAreaPermissions)->pluck('id')->toArray()
        );

        // Personal permissions
        $personalPermissions = [
            // Attendance
            'attendance.clock', 'attendance.view-own',
            // Requests
            'requests.create', 'requests.view-own', 'requests.edit',
            // Schedules
            'schedules.view-own', 'schedules.create', 'schedules.edit',
            // Meetings
            'meetings.view-own', 'meetings.create',
            // Expenses
            'expenses.create', 'expenses.view-own', 'expenses.edit',
            // Assets
            'assets.view-own',
            // Clients
            'clients.view-own', 'clients.edit',
            // Services
            'services.view-own', 'services.edit',
            // Inventory
            'inventory.view-all',
            // Tickets
            'tickets.create', 'tickets.view-own',
            // Notifications
            'notifications.view',
        ];

        $personal->permissions()->attach(
            Permission::whereIn('name', $personalPermissions)->pluck('id')->toArray()
        );

        $this->command->info('Roles and permissions created successfully!');
        $this->command->info('Super Admin has ' . count($allPermissions) . ' permissions');
        $this->command->info('Jefe de Área has ' . count($jefeAreaPermissions) . ' permissions');
        $this->command->info('Personal has ' . count($personalPermissions) . ' permissions');
    }
}
