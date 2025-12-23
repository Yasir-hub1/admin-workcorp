import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function PrivateRoute({ children, requiredRole = null, requiredPermission = null }) {
  const { isAuthenticated, user, hasRole, hasPermission, isSuperAdmin } = useAuthStore();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin has access to everything
  if (isSuperAdmin()) {
    return children;
  }

  // Check role requirement (only if not Super Admin)
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission requirement (only if not Super Admin)
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

