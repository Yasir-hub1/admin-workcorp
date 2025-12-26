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
        // Create Roles (idempotente)
        $superAdmin = Role::firstOrCreate(
            ['name' => 'super_admin'],
            [
                'display_name' => 'Super Administrador',
                'description' => 'Acceso total al sistema',
                'level' => 1,
            ]
        );

        $jefeArea = Role::firstOrCreate(
            ['name' => 'jefe_area'],
            [
                'display_name' => 'Jefe de Área',
                'description' => 'Gestiona su área y personal asignado',
                'level' => 2,
            ]
        );

        $personal = Role::firstOrCreate(
            ['name' => 'personal'],
            [
                'display_name' => 'Personal',
                'description' => 'Empleado del sistema',
                'level' => 3,
            ]
        );

        // Create Permissions by Module
        $allPermissions = [];

        // ========== USERS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'users.view'], ['module' => 'users', 'display_name' => 'Ver Usuarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'users.create'], ['module' => 'users', 'display_name' => 'Crear Usuarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'users.edit'], ['module' => 'users', 'display_name' => 'Editar Usuarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'users.delete'], ['module' => 'users', 'display_name' => 'Eliminar Usuarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'users.assign-roles'], ['module' => 'users', 'display_name' => 'Asignar Roles']);

        // ========== AREAS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'areas.view'], ['module' => 'areas', 'display_name' => 'Ver Áreas']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'areas.create'], ['module' => 'areas', 'display_name' => 'Crear Áreas']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'areas.edit'], ['module' => 'areas', 'display_name' => 'Editar Áreas']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'areas.delete'], ['module' => 'areas', 'display_name' => 'Eliminar Áreas']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'areas.manage-budget'], ['module' => 'areas', 'display_name' => 'Gestionar Presupuestos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'areas.assign-managers'], ['module' => 'areas', 'display_name' => 'Asignar Jefes de Área']);

        // ========== STAFF MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'staff.view-all'], ['module' => 'staff', 'display_name' => 'Ver Todo el Personal']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'staff.view-own'], ['module' => 'staff', 'display_name' => 'Ver Personal de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'staff.create'], ['module' => 'staff', 'display_name' => 'Crear Personal']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'staff.edit'], ['module' => 'staff', 'display_name' => 'Editar Personal']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'staff.delete'], ['module' => 'staff', 'display_name' => 'Eliminar Personal']);

        // ========== ATTENDANCE MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'attendance.view-all'], ['module' => 'attendance', 'display_name' => 'Ver Todas las Asistencias']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'attendance.view-area'], ['module' => 'attendance', 'display_name' => 'Ver Asistencias de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'attendance.view-own'], ['module' => 'attendance', 'display_name' => 'Ver Mis Asistencias']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'attendance.clock'], ['module' => 'attendance', 'display_name' => 'Marcar Asistencia']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'attendance.edit'], ['module' => 'attendance', 'display_name' => 'Editar Asistencias']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'attendance.delete'], ['module' => 'attendance', 'display_name' => 'Eliminar Asistencias']);

        // ========== REQUESTS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.view-all'], ['module' => 'requests', 'display_name' => 'Ver Todas las Solicitudes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.view-area'], ['module' => 'requests', 'display_name' => 'Ver Solicitudes de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.view-own'], ['module' => 'requests', 'display_name' => 'Ver Mis Solicitudes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.create'], ['module' => 'requests', 'display_name' => 'Crear Solicitudes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.edit'], ['module' => 'requests', 'display_name' => 'Editar Solicitudes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.approve'], ['module' => 'requests', 'display_name' => 'Aprobar Solicitudes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.reject'], ['module' => 'requests', 'display_name' => 'Rechazar Solicitudes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.cancel'], ['module' => 'requests', 'display_name' => 'Cancelar Solicitudes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'requests.delete'], ['module' => 'requests', 'display_name' => 'Eliminar Solicitudes']);

        // ========== SCHEDULES MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'schedules.view-all'], ['module' => 'schedules', 'display_name' => 'Ver Todos los Horarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'schedules.view-area'], ['module' => 'schedules', 'display_name' => 'Ver Horarios de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'schedules.view-own'], ['module' => 'schedules', 'display_name' => 'Ver Mis Horarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'schedules.create'], ['module' => 'schedules', 'display_name' => 'Crear Horarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'schedules.edit'], ['module' => 'schedules', 'display_name' => 'Editar Horarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'schedules.approve'], ['module' => 'schedules', 'display_name' => 'Aprobar Horarios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'schedules.delete'], ['module' => 'schedules', 'display_name' => 'Eliminar Horarios']);

        // ========== MEETINGS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'meetings.view-all'], ['module' => 'meetings', 'display_name' => 'Ver Todas las Reuniones']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'meetings.view-area'], ['module' => 'meetings', 'display_name' => 'Ver Reuniones de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'meetings.view-own'], ['module' => 'meetings', 'display_name' => 'Ver Mis Reuniones']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'meetings.create'], ['module' => 'meetings', 'display_name' => 'Crear Reuniones']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'meetings.edit'], ['module' => 'meetings', 'display_name' => 'Editar Reuniones']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'meetings.delete'], ['module' => 'meetings', 'display_name' => 'Eliminar Reuniones']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'meetings.resend-push'], ['module' => 'meetings', 'display_name' => 'Reenviar Notificación Push']);

        // ========== EXPENSES MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.view-all'], ['module' => 'expenses', 'display_name' => 'Ver Todos los Gastos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.view-area'], ['module' => 'expenses', 'display_name' => 'Ver Gastos de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.view-own'], ['module' => 'expenses', 'display_name' => 'Ver Mis Gastos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.create'], ['module' => 'expenses', 'display_name' => 'Crear Gastos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.edit'], ['module' => 'expenses', 'display_name' => 'Editar Gastos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.delete'], ['module' => 'expenses', 'display_name' => 'Eliminar Gastos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.approve-level-1'], ['module' => 'expenses', 'display_name' => 'Aprobar Gastos Nivel 1 ($0-$100)']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.approve-level-2'], ['module' => 'expenses', 'display_name' => 'Aprobar Gastos Nivel 2 ($100-$500)']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.approve-level-3'], ['module' => 'expenses', 'display_name' => 'Aprobar Gastos Nivel 3 ($500+)']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'expenses.mark-paid'], ['module' => 'expenses', 'display_name' => 'Marcar Gastos como Pagados']);

        // ========== ASSETS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.view-all'], ['module' => 'assets', 'display_name' => 'Ver Todos los Activos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.view-area'], ['module' => 'assets', 'display_name' => 'Ver Activos de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.view-own'], ['module' => 'assets', 'display_name' => 'Ver Mis Activos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.create'], ['module' => 'assets', 'display_name' => 'Crear Activos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.edit'], ['module' => 'assets', 'display_name' => 'Editar Activos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.delete'], ['module' => 'assets', 'display_name' => 'Eliminar Activos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.assign'], ['module' => 'assets', 'display_name' => 'Asignar Activos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.maintenance'], ['module' => 'assets', 'display_name' => 'Gestionar Mantenimientos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'assets.depreciate'], ['module' => 'assets', 'display_name' => 'Calcular Depreciación']);

        // ========== CLIENTS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.view-all'], ['module' => 'clients', 'display_name' => 'Ver Todos los Clientes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.view-area'], ['module' => 'clients', 'display_name' => 'Ver Clientes de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.view-own'], ['module' => 'clients', 'display_name' => 'Ver Mis Clientes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.create'], ['module' => 'clients', 'display_name' => 'Crear Clientes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.edit'], ['module' => 'clients', 'display_name' => 'Editar Clientes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.delete'], ['module' => 'clients', 'display_name' => 'Eliminar Clientes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.assign'], ['module' => 'clients', 'display_name' => 'Asignar Clientes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'clients.kardex'], ['module' => 'clients', 'display_name' => 'Ver Kardex de Cliente']);

        // ========== SERVICES MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.view-all'], ['module' => 'services', 'display_name' => 'Ver Todos los Servicios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.view-area'], ['module' => 'services', 'display_name' => 'Ver Servicios de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.view-own'], ['module' => 'services', 'display_name' => 'Ver Mis Servicios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.create'], ['module' => 'services', 'display_name' => 'Crear Servicios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.edit'], ['module' => 'services', 'display_name' => 'Editar Servicios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.delete'], ['module' => 'services', 'display_name' => 'Eliminar Servicios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.renew'], ['module' => 'services', 'display_name' => 'Renovar Servicios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.assign'], ['module' => 'services', 'display_name' => 'Asignar Servicios']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'services.manage-incidents'], ['module' => 'services', 'display_name' => 'Gestionar Incidencias']);

        // ========== INVENTORY MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'inventory.view-all'], ['module' => 'inventory', 'display_name' => 'Ver Todo el Inventario']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'inventory.view-area'], ['module' => 'inventory', 'display_name' => 'Ver Inventario de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'inventory.create'], ['module' => 'inventory', 'display_name' => 'Crear Items de Inventario']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'inventory.edit'], ['module' => 'inventory', 'display_name' => 'Editar Items de Inventario']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'inventory.delete'], ['module' => 'inventory', 'display_name' => 'Eliminar Items de Inventario']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'inventory.movements'], ['module' => 'inventory', 'display_name' => 'Registrar Movimientos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'inventory.adjust'], ['module' => 'inventory', 'display_name' => 'Ajustar Inventario']);

        // ========== TICKETS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.view-all'], ['module' => 'tickets', 'display_name' => 'Ver Todos los Tickets']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.view-area'], ['module' => 'tickets', 'display_name' => 'Ver Tickets de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.view-own'], ['module' => 'tickets', 'display_name' => 'Ver Mis Tickets']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.create'], ['module' => 'tickets', 'display_name' => 'Crear Tickets']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.edit'], ['module' => 'tickets', 'display_name' => 'Editar Tickets']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.assign'], ['module' => 'tickets', 'display_name' => 'Asignar Tickets']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.resolve'], ['module' => 'tickets', 'display_name' => 'Resolver Tickets']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.delete'], ['module' => 'tickets', 'display_name' => 'Eliminar Tickets']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.resend-push'], ['module' => 'tickets', 'display_name' => 'Reenviar Notificación Push']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'tickets.categories.manage'], ['module' => 'tickets', 'display_name' => 'Gestionar Categorías de Tickets']);

        // ========== NOTIFICATIONS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'notifications.view'], ['module' => 'notifications', 'display_name' => 'Ver Notificaciones']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'notifications.create'], ['module' => 'notifications', 'display_name' => 'Crear Notificaciones']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'notifications.delete'], ['module' => 'notifications', 'display_name' => 'Eliminar Notificaciones']);

        // ========== REPORTS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'reports.view-all'], ['module' => 'reports', 'display_name' => 'Ver Todos los Reportes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'reports.view-area'], ['module' => 'reports', 'display_name' => 'Ver Reportes de su Área']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'reports.generate'], ['module' => 'reports', 'display_name' => 'Generar Reportes']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'reports.export'], ['module' => 'reports', 'display_name' => 'Exportar Reportes']);

        // ========== ROLES & PERMISSIONS MODULES (FALTABAN) ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'roles.view'], ['module' => 'roles', 'display_name' => 'Ver Roles']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'roles.create'], ['module' => 'roles', 'display_name' => 'Crear Roles']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'roles.edit'], ['module' => 'roles', 'display_name' => 'Editar Roles']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'roles.delete'], ['module' => 'roles', 'display_name' => 'Eliminar Roles']);

        $allPermissions[] = Permission::firstOrCreate(['name' => 'permissions.view'], ['module' => 'permissions', 'display_name' => 'Ver Permisos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'permissions.create'], ['module' => 'permissions', 'display_name' => 'Crear Permisos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'permissions.edit'], ['module' => 'permissions', 'display_name' => 'Editar Permisos']);
        $allPermissions[] = Permission::firstOrCreate(['name' => 'permissions.delete'], ['module' => 'permissions', 'display_name' => 'Eliminar Permisos']);

        // ========== STATISTICS MODULE ==========
        $allPermissions[] = Permission::firstOrCreate(['name' => 'statistics.view'], ['module' => 'statistics', 'display_name' => 'Ver Estadísticas']);

        // ========== SYSTEM MODULE ==========
        $allPermissions[] = Permission::create(['name' => 'system.config', 'module' => 'system', 'display_name' => 'Configurar Sistema']);
        $allPermissions[] = Permission::create(['name' => 'system.audit', 'module' => 'system', 'display_name' => 'Ver Logs de Auditoría']);
        $allPermissions[] = Permission::create(['name' => 'system.backup', 'module' => 'system', 'display_name' => 'Gestionar Respaldos']);

        // ========== ASSIGN PERMISSIONS TO ROLES ==========

        // Super Admin gets ALL permissions (sin duplicar, sin pisar customizaciones)
        $superAdmin->permissions()->syncWithoutDetaching(
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
            'meetings.view-area', 'meetings.create', 'meetings.edit', 'meetings.resend-push',
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
            'tickets.view-area', 'tickets.create', 'tickets.assign', 'tickets.resolve', 'tickets.resend-push',
            // Notifications
            'notifications.view',
            // Reports
            'reports.view-area', 'reports.generate', 'reports.export',

            // Statistics
            'statistics.view',
        ];

        $jefeArea->permissions()->syncWithoutDetaching(
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

        $personal->permissions()->syncWithoutDetaching(
            Permission::whereIn('name', $personalPermissions)->pluck('id')->toArray()
        );

        $this->command->info('Roles and permissions created successfully!');
        $this->command->info('Super Admin has ' . count($allPermissions) . ' permissions');
        $this->command->info('Jefe de Área has ' . count($jefeAreaPermissions) . ' permissions');
        $this->command->info('Personal has ' . count($personalPermissions) . ' permissions');
    }
}
