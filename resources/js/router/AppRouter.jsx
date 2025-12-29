import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import PrivateRoute from '../components/PrivateRoute';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import AssetsPage from '../pages/assets/AssetsPage';
import CreateAssetPage from '../pages/assets/CreateAssetPage';
import AssetDetailPage from '../pages/assets/AssetDetailPage';
import ExpensesPage from '../pages/expenses/ExpensesPage';
import CreateExpensePage from '../pages/expenses/CreateExpensePage';
import ExpenseDetailPage from '../pages/expenses/ExpenseDetailPage';
import ClientsPage from '../pages/clients/ClientsPage';
import CreateClientPage from '../pages/clients/CreateClientPage';
import ClientDetailPage from '../pages/clients/ClientDetailPage';
import ServicesPage from '../pages/services/ServicesPage';
import CreateServicePage from '../pages/services/CreateServicePage';
import ServiceDetailPage from '../pages/services/ServiceDetailPage';
import InventoryPage from '../pages/InventoryPage';
import AttendancePage from '../pages/attendance/AttendancePage';
import RequestsPage from '../pages/requests/RequestsPage';
import CreateRequestPage from '../pages/requests/CreateRequestPage';
import RequestDetailPage from '../pages/requests/RequestDetailPage';
import SchedulesPage from '../pages/attendance/SchedulesPage';
import CreateSchedulePage from '../pages/attendance/CreateSchedulePage';
import ScheduleDetailPage from '../pages/attendance/ScheduleDetailPage';
import MeetingsPage from '../pages/meetings/MeetingsPage';
import MeetingDetailPage from '../pages/meetings/MeetingDetailPage';
import CreateMeetingPage from '../pages/meetings/CreateMeetingPage';
import TicketsPage from '../pages/tickets/TicketsPage';
import TicketDetailPage from '../pages/tickets/TicketDetailPage';
import CreateTicketPage from '../pages/tickets/CreateTicketPage';
import ReportsIndexPage from '../pages/reports/ReportsIndexPage';
import ExpensesReportPage from '../pages/reports/ExpensesReportPage';
import AttendanceReportPage from '../pages/reports/AttendanceReportPage';
import TicketsReportPage from '../pages/reports/TicketsReportPage';
import RequestsReportPage from '../pages/reports/RequestsReportPage';
import MeetingsReportPage from '../pages/reports/MeetingsReportPage';
import StatisticsDashboardPage from '../pages/statistics/StatisticsDashboardPage';
import AreasPage from '../pages/areas/AreasPage';
import AreaDetailPage from '../pages/areas/AreaDetailPage';
import CreateAreaPage from '../pages/areas/CreateAreaPage';
import StaffPage from '../pages/staff/StaffPage';
import CreateStaffPage from '../pages/staff/CreateStaffPage';
import StaffDetailPage from '../pages/staff/StaffDetailPage';
import UsersPage from '../pages/users/UsersPage';
import CreateUserPage from '../pages/users/CreateUserPage';
import UserDetailPage from '../pages/users/UserDetailPage';
import RolesPage from '../pages/roles/RolesPage';
import CreateRolePage from '../pages/roles/CreateRolePage';
import RoleDetailPage from '../pages/roles/RoleDetailPage';
import PermissionsPage from '../pages/permissions/PermissionsPage';
import CreatePermissionPage from '../pages/permissions/CreatePermissionPage';
import PermissionDetailPage from '../pages/permissions/PermissionDetailPage';
import NotificationsPage from '../pages/NotificationsPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import NotFoundPage from '../pages/NotFoundPage';
import useAuthStore from '../store/authStore';
import { useAuth } from '../hooks/useAuth';

export default function AppRouter() {
  const { isAuthenticated, user, token, setToken } = useAuthStore();
  const { isLoadingUser } = useAuth();

  // Initialize token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken && !token) {
      setToken(storedToken);
    }
  }, [token, setToken]);

  // Show loading state while checking authentication
  // Only show loading if we have a token but no user yet
  const storedToken = localStorage.getItem('auth_token');
  if (storedToken && !user && isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated && user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated && user ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <PrivateRoute>
            <AssetsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/assets/create"
        element={
          <PrivateRoute>
            <CreateAssetPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/assets/:id/edit"
        element={
          <PrivateRoute>
            <CreateAssetPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <PrivateRoute>
            <AssetDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <PrivateRoute>
            <ExpensesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses/create"
        element={
          <PrivateRoute>
            <CreateExpensePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses/:id/edit"
        element={
          <PrivateRoute>
            <CreateExpensePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/expenses/:id"
        element={
          <PrivateRoute>
            <ExpenseDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <PrivateRoute>
            <ClientsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/clients/create"
        element={
          <PrivateRoute>
            <CreateClientPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/clients/:id/edit"
        element={
          <PrivateRoute>
            <CreateClientPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <PrivateRoute>
            <ClientDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/services"
        element={
          <PrivateRoute>
            <ServicesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/services/create"
        element={
          <PrivateRoute>
            <CreateServicePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/services/:id/edit"
        element={
          <PrivateRoute>
            <CreateServicePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/services/:id"
        element={
          <PrivateRoute>
            <ServiceDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <PrivateRoute>
            <InventoryPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <PrivateRoute>
            <AttendancePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <PrivateRoute>
            <RequestsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/requests/create"
        element={
          <PrivateRoute>
            <CreateRequestPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/requests/:id/edit"
        element={
          <PrivateRoute>
            <CreateRequestPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <PrivateRoute>
            <RequestDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/schedules"
        element={
          <PrivateRoute>
            <SchedulesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/schedules/create"
        element={
          <PrivateRoute>
            <CreateSchedulePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/schedules/:id/edit"
        element={
          <PrivateRoute>
            <CreateSchedulePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/schedules/:id"
        element={
          <PrivateRoute>
            <ScheduleDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/meetings"
        element={
          <PrivateRoute>
            <MeetingsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/meetings/:id/edit"
        element={
          <PrivateRoute>
            <CreateMeetingPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/meetings/:id"
        element={
          <PrivateRoute>
            <MeetingDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <PrivateRoute>
            <TicketsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets/create"
        element={
          <PrivateRoute>
            <CreateTicketPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets/:id/edit"
        element={
          <PrivateRoute>
            <CreateTicketPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <PrivateRoute>
            <TicketDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <ReportsIndexPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/expenses"
        element={
          <PrivateRoute>
            <ExpensesReportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/attendance"
        element={
          <PrivateRoute>
            <AttendanceReportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/tickets"
        element={
          <PrivateRoute>
            <TicketsReportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/requests"
        element={
          <PrivateRoute>
            <RequestsReportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports/meetings"
        element={
          <PrivateRoute>
            <MeetingsReportPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/statistics"
        element={
          <PrivateRoute>
            <StatisticsDashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/areas"
        element={
          <PrivateRoute>
            <AreasPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/areas/create"
        element={
          <PrivateRoute>
            <CreateAreaPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/areas/:id"
        element={
          <PrivateRoute>
            <AreaDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/areas/:id/edit"
        element={
          <PrivateRoute>
            <CreateAreaPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/staff"
        element={
          <PrivateRoute>
            <StaffPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/staff/create"
        element={
          <PrivateRoute>
            <CreateStaffPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/staff/:id/edit"
        element={
          <PrivateRoute>
            <CreateStaffPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/staff/:id"
        element={
          <PrivateRoute>
            <StaffDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <UsersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/users/create"
        element={
          <PrivateRoute>
            <CreateUserPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/users/:id/edit"
        element={
          <PrivateRoute>
            <CreateUserPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/users/:id"
        element={
          <PrivateRoute>
            <UserDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <PrivateRoute requiredPermission="roles.view">
            <RolesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/roles/create"
        element={
          <PrivateRoute requiredPermission="roles.create">
            <CreateRolePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/roles/:id/edit"
        element={
          <PrivateRoute requiredPermission="roles.edit">
            <CreateRolePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/roles/:id"
        element={
          <PrivateRoute requiredPermission="roles.view">
            <RoleDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/permissions"
        element={
          <PrivateRoute requiredPermission="permissions.view">
            <PermissionsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/permissions/create"
        element={
          <PrivateRoute requiredPermission="permissions.create">
            <CreatePermissionPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/permissions/:id/edit"
        element={
          <PrivateRoute requiredPermission="permissions.edit">
            <CreatePermissionPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/permissions/:id"
        element={
          <PrivateRoute requiredPermission="permissions.view">
            <PermissionDetailPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <PrivateRoute>
            <NotificationsPage />
          </PrivateRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated && user ? '/dashboard' : '/login'} replace />}
      />

      {/* 404 - Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

