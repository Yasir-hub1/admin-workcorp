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
            Route::get('/', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'index'])
                ->middleware('permission:assets.view-all|assets.view-area|assets.view-own')
                ->name('api.v1.assets.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'store'])
                ->middleware('permission:assets.create')
                ->name('api.v1.assets.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'statistics'])
                ->middleware('permission:assets.view-all|assets.view-area|assets.view-own')
                ->name('api.v1.assets.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'show'])
                ->middleware('permission:assets.view-all|assets.view-area|assets.view-own')
                ->name('api.v1.assets.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'update'])
                ->middleware('permission:assets.edit')
                ->name('api.v1.assets.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetController::class, 'destroy'])
                ->middleware('permission:assets.delete')
                ->name('api.v1.assets.destroy');

            // Asset Maintenances
            Route::get('/{id}/maintenances', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'index'])
                ->middleware('permission:assets.maintenance')
                ->name('api.v1.assets.maintenances.index');
            Route::post('/{id}/maintenances', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'store'])
                ->middleware('permission:assets.maintenance')
                ->name('api.v1.assets.maintenances.store');
            Route::put('/maintenances/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'update'])
                ->middleware('permission:assets.maintenance')
                ->name('api.v1.assets.maintenances.update');
            Route::delete('/maintenances/{id}', [\App\Http\Controllers\Api\V1\Assets\AssetMaintenanceController::class, 'destroy'])
                ->middleware('permission:assets.maintenance')
                ->name('api.v1.assets.maintenances.destroy');
        });

        // Expenses Routes
        Route::prefix('expenses')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'index'])
                ->middleware('permission:expenses.view-all|expenses.view-area|expenses.view-own')
                ->name('api.v1.expenses.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'store'])
                ->middleware('permission:expenses.create')
                ->name('api.v1.expenses.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'statistics'])
                ->middleware('permission:expenses.view-all|expenses.view-area|expenses.view-own')
                ->name('api.v1.expenses.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'show'])
                ->middleware('permission:expenses.view-all|expenses.view-area|expenses.view-own')
                ->name('api.v1.expenses.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'update'])
                ->middleware('permission:expenses.edit')
                ->name('api.v1.expenses.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'destroy'])
                ->middleware('permission:expenses.delete')
                ->name('api.v1.expenses.destroy');
            Route::post('/{id}/approve', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'approve'])
                ->middleware('permission:expenses.approve-level-1|expenses.approve-level-2|expenses.approve-level-3')
                ->name('api.v1.expenses.approve');
            Route::post('/{id}/mark-as-paid', [\App\Http\Controllers\Api\V1\Expenses\ExpenseController::class, 'markAsPaid'])
                ->middleware('permission:expenses.mark-paid')
                ->name('api.v1.expenses.mark-as-paid');
        });

        // Clients Routes
        Route::prefix('clients')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'index'])
                ->middleware('permission:clients.view-all|clients.view-area|clients.view-own')
                ->name('api.v1.clients.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'store'])
                ->middleware('permission:clients.create')
                ->name('api.v1.clients.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'statistics'])
                ->middleware('permission:clients.view-all|clients.view-area|clients.view-own')
                ->name('api.v1.clients.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'show'])
                ->middleware('permission:clients.view-all|clients.view-area|clients.view-own')
                ->name('api.v1.clients.show');
            Route::get('/{id}/kardex', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'kardex'])
                ->middleware('permission:clients.kardex')
                ->name('api.v1.clients.kardex');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'update'])
                ->middleware('permission:clients.edit')
                ->name('api.v1.clients.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Clients\ClientController::class, 'destroy'])
                ->middleware('permission:clients.delete')
                ->name('api.v1.clients.destroy');
        });

        // Services Routes
        Route::prefix('services')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'index'])
                ->middleware('permission:services.view-all|services.view-area|services.view-own')
                ->name('api.v1.services.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'store'])
                ->middleware('permission:services.create')
                ->name('api.v1.services.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'statistics'])
                ->middleware('permission:services.view-all|services.view-area|services.view-own')
                ->name('api.v1.services.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'show'])
                ->middleware('permission:services.view-all|services.view-area|services.view-own')
                ->name('api.v1.services.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'update'])
                ->middleware('permission:services.edit')
                ->name('api.v1.services.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Services\ServiceController::class, 'destroy'])
                ->middleware('permission:services.delete')
                ->name('api.v1.services.destroy');
        });

        // Inventory Routes
        Route::prefix('inventory')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'index'])
                ->middleware('permission:inventory.view-all|inventory.view-area')
                ->name('api.v1.inventory.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'store'])
                ->middleware('permission:inventory.create')
                ->name('api.v1.inventory.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'statistics'])
                ->middleware('permission:inventory.view-all|inventory.view-area')
                ->name('api.v1.inventory.statistics');
            Route::get('/{inventoryItem}', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'show'])
                ->middleware('permission:inventory.view-all|inventory.view-area')
                ->name('api.v1.inventory.show');
            Route::put('/{inventoryItem}', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'update'])
                ->middleware('permission:inventory.edit')
                ->name('api.v1.inventory.update');
            Route::delete('/{inventoryItem}', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'destroy'])
                ->middleware('permission:inventory.delete')
                ->name('api.v1.inventory.destroy');
            Route::get('/{inventoryItem}/movements', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'movements'])
                ->middleware('permission:inventory.movements')
                ->name('api.v1.inventory.movements');
            Route::post('/{inventoryItem}/movements', [\App\Http\Controllers\Api\V1\Inventory\InventoryController::class, 'recordMovement'])
                ->middleware('permission:inventory.movements')
                ->name('api.v1.inventory.movements.store');
        });

        // Attendance Routes
        Route::prefix('attendance')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'index'])
                ->middleware('permission:attendance.view-all|attendance.view-area|attendance.view-own')
                ->name('api.v1.attendance.index');
            Route::post('/mark', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'mark'])
                ->middleware('permission:attendance.clock')
                ->name('api.v1.attendance.mark');
            Route::post('/check-in', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'checkIn'])->name('api.v1.attendance.check-in'); // Legacy
            Route::post('/check-out', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'checkOut'])->name('api.v1.attendance.check-out'); // Legacy
            Route::get('/today', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'today'])
                ->middleware('permission:attendance.view-all|attendance.view-area|attendance.view-own')
                ->name('api.v1.attendance.today');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'statistics'])
                ->middleware('permission:attendance.view-all|attendance.view-area|attendance.view-own')
                ->name('api.v1.attendance.statistics');
            Route::get('/{attendance}', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'show'])
                ->middleware('permission:attendance.view-all|attendance.view-area|attendance.view-own')
                ->name('api.v1.attendance.show');
            Route::put('/{attendance}', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'update'])
                ->middleware('permission:attendance.edit')
                ->name('api.v1.attendance.update');
            Route::delete('/records/{record}', [\App\Http\Controllers\Api\V1\Attendance\AttendanceController::class, 'deleteRecord'])
                ->middleware('permission:attendance.delete')
                ->name('api.v1.attendance.records.delete');
        });

        // Requests Routes (Solicitudes: permisos, vacaciones, licencias)
        Route::prefix('requests')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'index'])
                ->middleware('permission:requests.view-all|requests.view-area|requests.view-own')
                ->name('api.v1.requests.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'store'])
                ->middleware('permission:requests.create')
                ->name('api.v1.requests.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'statistics'])
                ->middleware('permission:requests.view-all|requests.view-area|requests.view-own')
                ->name('api.v1.requests.statistics');
            Route::get('/{request}', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'show'])
                ->middleware('permission:requests.view-all|requests.view-area|requests.view-own')
                ->name('api.v1.requests.show');
            Route::put('/{request}', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'update'])
                ->middleware('permission:requests.edit')
                ->name('api.v1.requests.update');
            Route::post('/{request}/approve', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'approve'])
                ->middleware('permission:requests.approve')
                ->name('api.v1.requests.approve');
            Route::post('/{request}/reject', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'reject'])
                ->middleware('permission:requests.reject')
                ->name('api.v1.requests.reject');
            Route::post('/{request}/cancel', [\App\Http\Controllers\Api\V1\Requests\RequestController::class, 'cancel'])
                ->middleware('permission:requests.cancel')
                ->name('api.v1.requests.cancel');
        });

        // Schedules Routes (Horarios mensuales)
        Route::prefix('schedules')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'index'])
                ->middleware('permission:schedules.view-all|schedules.view-area|schedules.view-own')
                ->name('api.v1.schedules.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'store'])
                ->middleware('permission:schedules.create')
                ->name('api.v1.schedules.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'show'])
                ->middleware('permission:schedules.view-all|schedules.view-area|schedules.view-own')
                ->name('api.v1.schedules.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'update'])
                ->middleware('permission:schedules.edit')
                ->name('api.v1.schedules.update');
            Route::post('/{id}/approve', [\App\Http\Controllers\Api\V1\Staff\ScheduleController::class, 'approve'])
                ->middleware('permission:schedules.approve')
                ->name('api.v1.schedules.approve');
        });

        // Meetings Routes
        Route::prefix('meetings')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'index'])
                ->middleware('permission:meetings.view-all|meetings.view-area|meetings.view-own')
                ->name('api.v1.meetings.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'store'])
                ->middleware('permission:meetings.create')
                ->name('api.v1.meetings.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'show'])
                ->middleware('permission:meetings.view-all|meetings.view-area|meetings.view-own')
                ->name('api.v1.meetings.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'update'])
                ->middleware('permission:meetings.edit')
                ->name('api.v1.meetings.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'destroy'])
                ->middleware('permission:meetings.delete')
                ->name('api.v1.meetings.destroy');
            Route::post('/{id}/resend-push', [\App\Http\Controllers\Api\V1\Meetings\MeetingController::class, 'resendPush'])
                ->middleware('permission:meetings.resend-push')
                ->name('api.v1.meetings.resend-push');
        });

        // Tickets Routes
        Route::prefix('tickets')->group(function () {
            Route::get('/categories', [\App\Http\Controllers\Api\V1\Tickets\TicketCategoryController::class, 'index'])
                ->middleware('permission:tickets.view-all|tickets.view-area|tickets.view-own')
                ->name('api.v1.tickets.categories.index');
            Route::post('/categories', [\App\Http\Controllers\Api\V1\Tickets\TicketCategoryController::class, 'store'])
                ->middleware('permission:tickets.categories.manage')
                ->name('api.v1.tickets.categories.store');
            Route::get('/', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'index'])
                ->middleware('permission:tickets.view-all|tickets.view-area|tickets.view-own')
                ->name('api.v1.tickets.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'store'])
                ->middleware('permission:tickets.create')
                ->name('api.v1.tickets.store');
            Route::get('/statistics', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'statistics'])
                ->middleware('permission:tickets.view-all|tickets.view-area|tickets.view-own')
                ->name('api.v1.tickets.statistics');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'show'])
                ->middleware('permission:tickets.view-all|tickets.view-area|tickets.view-own')
                ->name('api.v1.tickets.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'update'])
                ->middleware('permission:tickets.edit')
                ->name('api.v1.tickets.update');
            Route::post('/{id}/assign', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'assign'])
                ->middleware('permission:tickets.assign')
                ->name('api.v1.tickets.assign');
            Route::post('/{id}/resend-push', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'resendPush'])
                ->middleware('permission:tickets.resend-push')
                ->name('api.v1.tickets.resend-push');
            Route::post('/{id}/resolve', [\App\Http\Controllers\Api\V1\Tickets\TicketController::class, 'resolve'])
                ->middleware('permission:tickets.resolve')
                ->name('api.v1.tickets.resolve');
        });

        // Notifications Routes
        Route::prefix('notifications')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'index'])
                ->middleware('permission:notifications.view')
                ->name('api.v1.notifications.index');
            Route::get('/unread-count', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'unreadCount'])
                ->middleware('permission:notifications.view')
                ->name('api.v1.notifications.unread-count');
            Route::post('/{notification}/mark-as-read', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'markAsRead'])
                ->middleware('permission:notifications.view')
                ->name('api.v1.notifications.mark-as-read');
            Route::post('/mark-all-as-read', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'markAllAsRead'])
                ->middleware('permission:notifications.view')
                ->name('api.v1.notifications.mark-all-as-read');
            Route::delete('/{notification}', [\App\Http\Controllers\Api\V1\Notifications\NotificationController::class, 'destroy'])
                ->middleware('permission:notifications.delete')
                ->name('api.v1.notifications.destroy');
        });

        // Areas Routes
        Route::prefix('areas')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'index'])
                ->middleware('permission:areas.view')
                ->name('api.v1.areas.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'store'])
                ->middleware('permission:areas.create')
                ->name('api.v1.areas.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'show'])
                ->middleware('permission:areas.view')
                ->name('api.v1.areas.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'update'])
                ->middleware('permission:areas.edit')
                ->name('api.v1.areas.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'destroy'])
                ->middleware('permission:areas.delete')
                ->name('api.v1.areas.destroy');
            Route::get('/{id}/statistics', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'statistics'])
                ->middleware('permission:areas.view')
                ->name('api.v1.areas.statistics');
            Route::post('/{id}/managers', [\App\Http\Controllers\Api\V1\Areas\AreaController::class, 'assignManagers'])
                ->middleware('permission:areas.assign-managers')
                ->name('api.v1.areas.assign-managers');
        });

        // Staff Routes
        Route::prefix('staff')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'index'])
                ->middleware('permission:staff.view-all|staff.view-own')
                ->name('api.v1.staff.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'store'])
                ->middleware('permission:staff.create')
                ->name('api.v1.staff.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'show'])
                ->middleware('permission:staff.view-all|staff.view-own')
                ->name('api.v1.staff.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'update'])
                ->middleware('permission:staff.edit')
                ->name('api.v1.staff.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'destroy'])
                ->middleware('permission:staff.delete')
                ->name('api.v1.staff.destroy');
            Route::post('/{id}/location', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'updateLocation'])->name('api.v1.staff.update-location');
            Route::get('/{id}/salaries', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'salaries'])->name('api.v1.staff.salaries');
            Route::post('/{id}/salaries', [\App\Http\Controllers\Api\V1\Staff\StaffController::class, 'storeSalary'])->name('api.v1.staff.store-salary');
        });

        // Users Routes
        Route::prefix('users')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'index'])
                ->middleware('permission:users.view')
                ->name('api.v1.users.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'store'])
                ->middleware('permission:users.create')
                ->name('api.v1.users.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'show'])
                ->middleware('permission:users.view')
                ->name('api.v1.users.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'update'])
                ->middleware('permission:users.edit')
                ->name('api.v1.users.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Users\UserController::class, 'destroy'])
                ->middleware('permission:users.delete')
                ->name('api.v1.users.destroy');
        });

        // Roles Routes
        Route::prefix('roles')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'index'])
                ->middleware('permission:roles.view')
                ->name('api.v1.roles.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'store'])
                ->middleware('permission:roles.create')
                ->name('api.v1.roles.store');
            Route::get('/permissions', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'permissions'])
                ->middleware('permission:roles.view')
                ->name('api.v1.roles.permissions');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'show'])
                ->middleware('permission:roles.view')
                ->name('api.v1.roles.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'update'])
                ->middleware('permission:roles.edit')
                ->name('api.v1.roles.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Roles\RoleController::class, 'destroy'])
                ->middleware('permission:roles.delete')
                ->name('api.v1.roles.destroy');
        });

        // Permissions Routes
        Route::prefix('permissions')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'index'])
                ->middleware('permission:permissions.view')
                ->name('api.v1.permissions.index');
            Route::get('/modules', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'modules'])
                ->middleware('permission:permissions.view')
                ->name('api.v1.permissions.modules');
            Route::post('/', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'store'])
                ->middleware('permission:permissions.create')
                ->name('api.v1.permissions.store');
            Route::get('/{id}', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'show'])
                ->middleware('permission:permissions.view')
                ->name('api.v1.permissions.show');
            Route::put('/{id}', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'update'])
                ->middleware('permission:permissions.edit')
                ->name('api.v1.permissions.update');
            Route::delete('/{id}', [\App\Http\Controllers\Api\V1\Permissions\PermissionController::class, 'destroy'])
                ->middleware('permission:permissions.delete')
                ->name('api.v1.permissions.destroy');
        });

        // Push Subscriptions Routes
        Route::prefix('push-subscriptions')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\V1\PushSubscriptions\PushSubscriptionController::class, 'index'])->name('api.v1.push-subscriptions.index');
            Route::post('/', [\App\Http\Controllers\Api\V1\PushSubscriptions\PushSubscriptionController::class, 'store'])->name('api.v1.push-subscriptions.store');
            Route::delete('/', [\App\Http\Controllers\Api\V1\PushSubscriptions\PushSubscriptionController::class, 'destroy'])->name('api.v1.push-subscriptions.destroy');
        });

        // Reports Routes
        Route::prefix('reports')->group(function () {
            Route::get('/expenses', [\App\Http\Controllers\Api\V1\Reports\ExpensesReportController::class, 'index'])
                ->middleware('permission:reports.view-all|reports.view-area')
                ->name('api.v1.reports.expenses');
            Route::get('/attendance', [\App\Http\Controllers\Api\V1\Reports\AttendanceReportController::class, 'index'])
                ->middleware('permission:reports.view-all|reports.view-area')
                ->name('api.v1.reports.attendance');
            Route::get('/tickets', [\App\Http\Controllers\Api\V1\Reports\TicketsReportController::class, 'index'])
                ->middleware('permission:reports.view-all|reports.view-area')
                ->name('api.v1.reports.tickets');
            Route::get('/requests', [\App\Http\Controllers\Api\V1\Reports\RequestsReportController::class, 'index'])
                ->middleware('permission:reports.view-all|reports.view-area')
                ->name('api.v1.reports.requests');
            Route::get('/meetings', [\App\Http\Controllers\Api\V1\Reports\MeetingsReportController::class, 'index'])
                ->middleware('permission:reports.view-all|reports.view-area')
                ->name('api.v1.reports.meetings');

            Route::get('/expenses/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'expenses'])
                ->middleware('permission:reports.export')
                ->name('api.v1.reports.expenses.export');
            Route::get('/attendance/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'attendance'])
                ->middleware('permission:reports.export')
                ->name('api.v1.reports.attendance.export');
            Route::get('/tickets/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'tickets'])
                ->middleware('permission:reports.export')
                ->name('api.v1.reports.tickets.export');
            Route::get('/requests/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'requests'])
                ->middleware('permission:reports.export')
                ->name('api.v1.reports.requests.export');
            Route::get('/meetings/export', [\App\Http\Controllers\Api\V1\Reports\ReportsExportController::class, 'meetings'])
                ->middleware('permission:reports.export')
                ->name('api.v1.reports.meetings.export');
        });

        // Statistics Routes (dashboard BI)
        Route::prefix('statistics')->group(function () {
            Route::get('/overview', [\App\Http\Controllers\Api\V1\Statistics\StatisticsController::class, 'overview'])
                ->middleware('permission:statistics.view')
                ->name('api.v1.statistics.overview');
        });
    });
});
