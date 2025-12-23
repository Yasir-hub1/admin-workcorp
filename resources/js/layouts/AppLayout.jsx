import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import useAuthStore from '../store/authStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { pushNotificationService } from '../services/pushNotificationService';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import {
  HomeIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  CubeIcon,
  ClockIcon,
  DocumentTextIcon,
  CalendarIcon,
  CalendarDaysIcon,
  TicketIcon,
  BuildingOffice2Icon,
  BellIcon,
  PresentationChartLineIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Asistencias', href: '/attendance', icon: ClockIcon },
  { name: 'Solicitudes', href: '/requests', icon: DocumentTextIcon },
  { name: 'Horarios', href: '/schedules', icon: CalendarIcon },
  { name: 'Reuniones', href: '/meetings', icon: CalendarDaysIcon },
  { name: 'Tickets', href: '/tickets', icon: TicketIcon },
  { name: 'Activos', href: '/assets', icon: BuildingOfficeIcon },
  { name: 'Gastos', href: '/expenses', icon: CurrencyDollarIcon },
  { name: 'Clientes', href: '/clients', icon: UserGroupIcon },
  { name: 'Servicios', href: '/services', icon: Cog6ToothIcon },
  { name: 'Inventario', href: '/inventory', icon: CubeIcon },
  { name: 'Personal', href: '/staff', icon: UserGroupIcon },
  { name: 'Usuarios', href: '/users', icon: UserGroupIcon },
  { name: 'Áreas', href: '/areas', icon: BuildingOffice2Icon },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon },
  { name: 'Permisos', href: '/permissions', icon: KeyIcon },
  { name: 'Notificaciones', href: '/notifications', icon: BellIcon },
  { name: 'Reportes', href: '/reports', icon: ChartBarIcon },
  { name: 'Estadísticas', href: '/statistics', icon: PresentationChartLineIcon },
];

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutMutation } = useAuth();
  const { user, isSuperAdmin, isJefeArea, isPersonal } = useAuthStore();
  
  // Inicializar push notifications para admins y jefes de área
  usePushNotifications(user && (isSuperAdmin() || isJefeArea()));

  // Contador de notificaciones no leídas
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data.data.count;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = unreadCountData || 0;

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // En desktop, el sidebar siempre debe estar visible
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile]);


  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isMobile ? (sidebarOpen ? 0 : -256) : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between h-16 px-4 border-b border-gray-200"
          >
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              WorkCorp Admin
            </h1>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </motion.button>
          </motion.div>

          {/* User Info */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-4 py-4 border-b border-gray-200"
          >
            <div className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="flex-shrink-0"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </motion.div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs text-indigo-600 mt-1 font-medium"
                >
                  {isSuperAdmin() && 'Super Admin'}
                  {isJefeArea() && 'Jefe de Área'}
                  {isPersonal() && 'Personal'}
                </motion.p>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-indigo-600' : ''}`} />
                    </motion.div>
                    {item.name}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Logout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="px-4 py-4 border-t border-gray-200"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              Cerrar Sesión
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Bars3Icon className="h-6 w-6" />
          </motion.button>
          <div className="flex-1 lg:ml-0 ml-4 flex items-center justify-between">
            <motion.h2
              key={location.pathname}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-lg font-semibold text-gray-900"
            >
              {navigation.find((item) => location.pathname.startsWith(item.href))?.name || 'Dashboard'}
            </motion.h2>

            <div className="flex items-center gap-2">
              {/* Botón de prueba de suscripción (solo en desarrollo) */}
              {import.meta.env.DEV && (isSuperAdmin() || isJefeArea()) && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      console.log('[Push] Manual subscription test...');
                      await pushNotificationService.subscribe();
                      toast.success('Suscripción push creada correctamente');
                    } catch (error) {
                      console.error('[Push] Manual subscription failed:', error);
                      toast.error('Error: ' + error.message);
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                  title="Probar suscripción push"
                >
                  Test Push
                </motion.button>
              )}

              {/* Icono de notificaciones en el top bar */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/notifications')}
                className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"
              >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Page content */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-4 lg:p-8"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}

