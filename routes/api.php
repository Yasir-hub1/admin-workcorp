<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// API Version 1 Routes
Route::prefix('v1')->group(function () {

    // Public Auth Routes
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->name('api.v1.auth.login');
        Route::post('/register', [AuthController::class, 'register'])->name('api.v1.auth.register');

        // Password Reset (To be implemented)
        Route::post('/forgot-password', function() {
            return response()->json(['message' => 'Forgot password endpoint - To be implemented']);
        })->name('api.v1.auth.forgot-password');

        Route::post('/reset-password', function() {
            return response()->json(['message' => 'Reset password endpoint - To be implemented']);
        })->name('api.v1.auth.reset-password');
    });

    // Protected Routes
    Route::middleware(['auth:sanctum'])->group(function () {

        // Auth Protected Routes
        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me'])->name('api.v1.auth.me');
            Route::post('/logout', [AuthController::class, 'logout'])->name('api.v1.auth.logout');
            Route::post('/logout-all', [AuthController::class, 'logoutAll'])->name('api.v1.auth.logout-all');
            Route::post('/refresh', [AuthController::class, 'refresh'])->name('api.v1.auth.refresh');
        });

        // Test route to verify authentication
        Route::get('/test', function(Request $request) {
            return response()->json([
                'success' => true,
                'message' => 'API funcionando correctamente',
                'data' => [
                    'user' => $request->user(),
                    'timestamp' => now()->toDateTimeString(),
                ],
            ]);
        })->name('api.v1.test');

        // Assets Routes
        Route::prefix('assets')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'index'])->name('api.v1.assets.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'store'])->name('api.v1.assets.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'statistics'])->name('api.v1.assets.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'show'])->name('api.v1.assets.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'update'])->name('api.v1.assets.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'destroy'])->name('api.v1.assets.destroy');

            // Asset Maintenances
            Route::get('/{id}/maintenances', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'index'])->name('api.v1.assets.maintenances.index');
            Route::post('/{id}/maintenances', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'store'])->name('api.v1.assets.maintenances.store');
            Route::put('/maintenances/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'update'])->name('api.v1.assets.maintenances.update');
            Route::delete('/maintenances/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'destroy'])->name('api.v1.assets.maintenances.destroy');
        });

        // Expenses Routes
        Route::prefix('expenses')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'index'])->name('api.v1.expenses.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'store'])->name('api.v1.expenses.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'statistics'])->name('api.v1.expenses.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'show'])->name('api.v1.expenses.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'update'])->name('api.v1.expenses.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'destroy'])->name('api.v1.expenses.destroy');
            Route::post('/{id}/approve', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'approve'])->name('api.v1.expenses.approve');
            Route::post('/{id}/mark-as-paid', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'markAsPaid'])->name('api.v1.expenses.mark-as-paid');
        });

        // Clients Routes
        Route::prefix('clients')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'index'])->name('api.v1.clients.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'store'])->name('api.v1.clients.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'statistics'])->name('api.v1.clients.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'show'])->name('api.v1.clients.show');
            Route::get('/{id}/kardex', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'kardex'])->name('api.v1.clients.kardex');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'update'])->name('api.v1.clients.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'destroy'])->name('api.v1.clients.destroy');
        });

        // Services Routes
        Route::prefix('services')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'index'])->name('api.v1.services.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'store'])->name('api.v1.services.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'statistics'])->name('api.v1.services.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'show'])->name('api.v1.services.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'update'])->name('api.v1.services.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'destroy'])->name('api.v1.services.destroy');
        });

        // Inventory Routes
        Route::prefix('inventory')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'index'])->name('api.v1.inventory.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'store'])->name('api.v1.inventory.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'statistics'])->name('api.v1.inventory.statistics');
            Route::get('/{inventoryItem}', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'show'])->name('api.v1.inventory.show');
            Route::put('/{inventoryItem}', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'update'])->name('api.v1.inventory.update');
            Route::delete('/{inventoryItem}', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'destroy'])->name('api.v1.inventory.destroy');
            Route::get('/{inventoryItem}/movements', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'movements'])->name('api.v1.inventory.movements');
            Route::post('/{inventoryItem}/movements', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'recordMovement'])->name('api.v1.inventory.movements.store');
        });

        // Attendance Routes
        Route::prefix('attendance')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'index'])->name('api.v1.attendance.index');
            Route::post('/mark', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'mark'])->name('api.v1.attendance.mark');
            Route::post('/check-in', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'checkIn'])->name('api.v1.attendance.check-in'); // Legacy
            Route::post('/check-out', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'checkOut'])->name('api.v1.attendance.check-out'); // Legacy
            Route::get('/today', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'today'])->name('api.v1.attendance.today');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'statistics'])->name('api.v1.attendance.statistics');
            Route::get('/{attendance}', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'show'])->name('api.v1.attendance.show');
            Route::put('/{attendance}', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'update'])->name('api.v1.attendance.update');
            Route::delete('/records/{record}', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'deleteRecord'])->name('api.v1.attendance.records.delete');
        });

        // Requests Routes (Solicitudes: permisos, vacaciones, licencias)
        Route::prefix('requests')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'index'])->name('api.v1.requests.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'store'])->name('api.v1.requests.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'statistics'])->name('api.v1.requests.statistics');
            Route::get('/{request}', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'show'])->name('api.v1.requests.show');
            Route::put('/{request}', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'update'])->name('api.v1.requests.update');
            Route::post('/{request}/approve', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'approve'])->name('api.v1.requests.approve');
            Route::post('/{request}/reject', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'reject'])->name('api.v1.requests.reject');
            Route::post('/{request}/cancel', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'cancel'])->name('api.v1.requests.cancel');
        });

        // Schedules Routes (Horarios mensuales)
        Route::prefix('schedules')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'index'])->name('api.v1.schedules.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'store'])->name('api.v1.schedules.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'show'])->name('api.v1.schedules.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'update'])->name('api.v1.schedules.update');
            Route::post('/{id}/approve', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'approve'])->name('api.v1.schedules.approve');
        });

        // Meetings Routes
        Route::prefix('meetings')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'index'])->name('api.v1.meetings.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'store'])->name('api.v1.meetings.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'show'])->name('api.v1.meetings.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'update'])->name('api.v1.meetings.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'destroy'])->name('api.v1.meetings.destroy');
            Route::post('/{id}/resend-push', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'resendPush'])->name('api.v1.meetings.resend-push');
        });

        // Tickets Routes
        Route::prefix('tickets')->group(function () {
            Route::get('/categories', [\App\Http\Controllers\Api\V1\Tickets\TicketCategoryController::class, 'index'])->name('api.v1.tickets.categories.index');
            Route::post('/categories', [\App\Http\Controllers\Api\V1\Tickets\TicketCategoryController::class, 'store'])->name('api.v1.tickets.categories.store');
            Route::get('/', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'index'])->name('api.v1.tickets.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'store'])->name('api.v1.tickets.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'statistics'])->name('api.v1.tickets.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'show'])->name('api.v1.tickets.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'update'])->name('api.v1.tickets.update');
            Route::post('/{id}/assign', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'assign'])->name('api.v1.tickets.assign');
            Route::post('/{id}/resend-push', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'resendPush'])->name('api.v1.tickets.resend-push');
            Route::post('/{id}/resolve', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'resolve'])->name('api.v1.tickets.resolve');
        });

        // Notifications Routes
        Route::prefix('notifications')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'index'])->name('api.v1.notifications.index');
            Route::get('/unread-count', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'unreadCount'])->name('api.v1.notifications.unread-count');
            Route::post('/{notification}/mark-as-read', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'markAsRead'])->name('api.v1.notifications.mark-as-read');
            Route::post('/mark-all-as-read', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'markAllAsRead'])->name('api.v1.notifications.mark-all-as-read');
            Route::delete('/{notification}', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'destroy'])->name('api.v1.notifications.destroy');
        });

        // Areas Routes
        Route::prefix('areas')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'index'])->name('api.v1.areas.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'store'])->name('api.v1.areas.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'show'])->name('api.v1.areas.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'update'])->name('api.v1.areas.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'destroy'])->name('api.v1.areas.destroy');
            Route::get('/{id}/statistics', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'statistics'])->name('api.v1.areas.statistics');
            Route::post('/{id}/managers', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'assignManagers'])->name('api.v1.areas.assign-managers');
        });

        // Staff Routes
        Route::prefix('staff')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'index'])->name('api.v1.staff.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'store'])->name('api.v1.staff.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'show'])->name('api.v1.staff.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'update'])->name('api.v1.staff.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'destroy'])->name('api.v1.staff.destroy');
            Route::post('/{id}/location', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'updateLocation'])->name('api.v1.staff.update-location');
            Route::get('/{id}/salaries', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'salaries'])->name('api.v1.staff.salaries');
            Route::post('/{id}/salaries', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'storeSalary'])->name('api.v1.staff.store-salary');
        });

        // Users Routes
        Route::prefix('users')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'index'])->name('api.v1.users.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'store'])->name('api.v1.users.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'show'])->name('api.v1.users.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'update'])->name('api.v1.users.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'destroy'])->name('api.v1.users.destroy');
        });

        // Roles Routes
        Route::prefix('roles')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'index'])->name('api.v1.roles.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'store'])->name('api.v1.roles.store');
            Route::get('/permissions', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'permissions'])->name('api.v1.roles.permissions');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'show'])->name('api.v1.roles.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'update'])->name('api.v1.roles.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'destroy'])->name('api.v1.roles.destroy');
        });

        // Permissions Routes
        Route::prefix('permissions')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'index'])->name('api.v1.permissions.index');
            Route::get('/modules', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'modules'])->name('api.v1.permissions.modules');
            Route::post('/', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'store'])->name('api.v1.permissions.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'show'])->name('api.v1.permissions.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'update'])->name('api.v1.permissions.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'destroy'])->name('api.v1.permissions.destroy');
        });

        // Push Subscriptions Routes
        Route::prefix('push-subscriptions')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\PushSubscriptions\PushSubscriptionController::class, 'index'])->name('api.v1.push-subscriptions.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\PushSubscriptions\PushSubscriptionController::class, 'store'])->name('api.v1.push-subscriptions.store');
            Route::delete('/', [\App\Http\Controllers\Api\V1\PushSubscriptions\PushSubscriptionController::class, 'destroy'])->name('api.v1.push-subscriptions.destroy');
        });

        // Reports Routes
        Route::prefix('reports')->group(function () {
            Route::get('/expenses', [\App\Http\Controllers\Api\V1\Reports\ExpensesReportController::class, 'index'])->name('api.v1.reports.expenses');
            Route::get('/attendance', [\App\Http\Controllers\Api\V1\Reports\AttendanceReportController::class, 'index'])->name('api.v1.reports.attendance');
            Route::get('/tickets', [\App\Http\Controllers\Api\V1\Reports\TicketsReportController::class, 'index'])->name('api.v1.reports.tickets');
            Route::get('/requests', [\App\Http\Controllers\Api\V1\Reports\RequestsReportController::class, 'index'])->name('api.v1.reports.requests');
            Route::get('/meetings', [\App\Http\Controllers\Api\V1\Reports\MeetingsReportController::class, 'index'])->name('api.v1.reports.meetings');

            Route::get('/expenses/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'expenses'])->name('api.v1.reports.expenses.export');
            Route::get('/attendance/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'attendance'])->name('api.v1.reports.attendance.export');
            Route::get('/tickets/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'tickets'])->name('api.v1.reports.tickets.export');
            Route::get('/requests/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'requests'])->name('api.v1.reports.requests.export');
            Route::get('/meetings/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'meetings'])->name('api.v1.reports.meetings.export');
        });

        // Statistics Routes (dashboard BI)
        Route::prefix('statistics')->group(function () {
            Route::get('/overview', [\App\Http\Controllers\Api\V1\Statistics\StatisticsController::class, 'overview'])->name('api.v1.statistics.overview');
        });
    });
});
