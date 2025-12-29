import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import useAuthStore from '../store/authStore';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { pushNotificationService } from '../services/pushNotificationService';
import apiClient from '../api/client';
import toast from 'react-hot-toast';
import { initNotificationAudio, playNotificationSound } from '../utils/notificationSound';
import { initNotificationVoice, speakNotificationReminder } from '../utils/notificationVoice';
import SupportCalendarModal from '../components/support/SupportCalendarModal';
import NotesWidget from '../components/notes/NotesWidget';
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
  {
    name: 'Asistencias',
    href: '/attendance',
    icon: ClockIcon,
    anyPermissions: ['attendance.view-all', 'attendance.view-area', 'attendance.view-own', 'attendance.clock'],
  },
  {
    name: 'Solicitudes',
    href: '/requests',
    icon: DocumentTextIcon,
    anyPermissions: ['requests.view-all', 'requests.view-area', 'requests.view-own', 'requests.create'],
  },
  {
    name: 'Horarios',
    href: '/schedules',
    icon: CalendarIcon,
    anyPermissions: ['schedules.view-all', 'schedules.view-area', 'schedules.view-own', 'schedules.create'],
  },
  {
    name: 'Reuniones',
    href: '/meetings',
    icon: CalendarDaysIcon,
    anyPermissions: ['meetings.view-all', 'meetings.view-area', 'meetings.view-own', 'meetings.create'],
  },
  {
    name: 'Tickets',
    href: '/tickets',
    icon: TicketIcon,
    anyPermissions: ['tickets.view-all', 'tickets.view-area', 'tickets.view-own', 'tickets.create'],
  },
  {
    name: 'Activos',
    href: '/assets',
    icon: BuildingOfficeIcon,
    anyPermissions: ['assets.view-all', 'assets.view-area', 'assets.view-own', 'assets.create'],
  },
  {
    name: 'Gastos',
    href: '/expenses',
    icon: CurrencyDollarIcon,
    anyPermissions: ['expenses.view-all', 'expenses.view-area', 'expenses.view-own', 'expenses.create'],
  },
  {
    name: 'Clientes',
    href: '/clients',
    icon: UserGroupIcon,
    anyPermissions: ['clients.view-detail', 'clients.view-all', 'clients.view-area', 'clients.view-own', 'clients.create'],
  },
  {
    name: 'Servicios',
    href: '/services',
    icon: Cog6ToothIcon,
    anyPermissions: ['services.view-all', 'services.view-area', 'services.view-own', 'services.create'],
  },
  {
    name: 'Inventario',
    href: '/inventory',
    icon: CubeIcon,
    anyPermissions: ['inventory.view-all', 'inventory.view-area', 'inventory.create'],
  },
  {
    name: 'Personal',
    href: '/staff',
    icon: UserGroupIcon,
    anyPermissions: ['staff.view-all', 'staff.view-own'],
  },
  { name: 'Usuarios', href: '/users', icon: UserGroupIcon, anyPermissions: ['users.view'] },
  { name: 'Áreas', href: '/areas', icon: BuildingOffice2Icon, anyPermissions: ['areas.view'] },
  { name: 'Roles', href: '/roles', icon: ShieldCheckIcon, anyPermissions: ['roles.view'] },
  { name: 'Permisos', href: '/permissions', icon: KeyIcon, anyPermissions: ['permissions.view'] },
  { name: 'Notificaciones', href: '/notifications', icon: BellIcon, anyPermissions: ['notifications.view'] },
  { name: 'Reportes', href: '/reports', icon: ChartBarIcon, anyPermissions: ['reports.view-all', 'reports.view-area'] },
  { name: 'Estadísticas', href: '/statistics', icon: PresentationChartLineIcon, anyPermissions: ['statistics.view'] },
];

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [supportCalendarOpen, setSupportCalendarOpen] = useState(false);
  const notifRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { logoutMutation } = useAuth();
  const { user, isSuperAdmin, isJefeArea, isPersonal, hasPermission } = useAuthStore();
  const canManageSupportCalendar = isSuperAdmin() || hasPermission('support_calendar.manage');

  const { data: supportCalendarAccessData } = useQuery({
    queryKey: ['support-calendar', 'access'],
    queryFn: async () => {
      const res = await apiClient.get('/support-calendar/access');
      return res.data.data;
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const canViewSupportCalendar = !!(supportCalendarAccessData?.can_view || canManageSupportCalendar);

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
  const prevUnreadRef = useRef(0);
  const voiceLastSpokenRef = useRef(0);

  const { data: recentNotificationsData, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications', { params: { per_page: 5 } });
      return response.data;
    },
    enabled: !!user,
    staleTime: 15000,
  });

  const recentNotifications = recentNotificationsData?.data || [];

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.post(`/notifications/${notificationId}/mark-as-read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
      queryClient.invalidateQueries(['notifications', 'recent']);
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/mark-all-as-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'unread-count']);
      queryClient.invalidateQueries(['notifications', 'recent']);
      toast.success('Todas las notificaciones marcadas como leídas');
    },
  });

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desbloquear audio en el primer gesto del usuario (requisito del navegador)
  useEffect(() => {
    const unlock = () => {
      initNotificationAudio();
      initNotificationVoice();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Sonido cuando llegan nuevas notificaciones (sube el contador)
  useEffect(() => {
    const prev = prevUnreadRef.current;
    // No sonar en primer render (prev=0) si el usuario ya tenía notificaciones acumuladas
    if (prev > 0 && unreadCount > prev) {
      playNotificationSound();
      if (unreadCount > 0) {
        speakNotificationReminder(`Tienes ${unreadCount} notificaciones por leer`);
      }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount]);

  // Voz recordatoria: si el usuario tiene notificaciones por leer, repetir cada ~10 min mientras esté en la app
  useEffect(() => {
    if (!user) return;
    if (!(isSuperAdmin() || hasPermission('notifications.view'))) return;
    if (!unreadCount || unreadCount <= 0) return;

    const now = Date.now();
    if (voiceLastSpokenRef.current === 0) {
      // Primer aviso en sesión (no spamear si ya venía con acumuladas: esperamos a que haya gesto de usuario)
      voiceLastSpokenRef.current = now;
      speakNotificationReminder(`Tienes ${unreadCount} notificaciones por leer`);
    }

    const interval = window.setInterval(() => {
      if (document.hidden) return;
      const since = Date.now() - voiceLastSpokenRef.current;
      if (since >= 10 * 60 * 1000) {
        voiceLastSpokenRef.current = Date.now();
        speakNotificationReminder(`Tienes ${unreadCount} notificaciones por leer`);
      }
    }, 30 * 1000);

    return () => window.clearInterval(interval);
  }, [user, unreadCount, isSuperAdmin, hasPermission]);

  // Sonido cuando llega PUSH y la app está abierta (SW -> postMessage)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event) => {
      if (event?.data?.type === 'PUSH_RECEIVED') {
        playNotificationSound();
        // Voz corta al recibir push (solo si hay permiso para ver notificaciones)
        if (user && (isSuperAdmin() || hasPermission('notifications.view'))) {
          speakNotificationReminder('Nueva notificación');
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [user, isSuperAdmin, hasPermission]);

  // En desktop, el sidebar siempre debe estar visible
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Cerrar dropdown de notificaciones al navegar
  useEffect(() => {
    setNotifOpen(false);
  }, [location.pathname]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!notifOpen) return;
    const onDocClick = (e) => {
      if (!notifRef.current) return;
      if (!notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [notifOpen]);


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
                    {(user?.name?.charAt(0)?.toUpperCase?.() || '?')}
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
            {navigation
              .filter((item) => {
                if (!user) return false;
                if (isSuperAdmin()) return true;
                if (!item.anyPermissions || item.anyPermissions.length === 0) return true;
                return item.anyPermissions.some((p) => hasPermission(p));
              })
              .map((item, index) => {
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
              {user && canViewSupportCalendar && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSupportCalendarOpen(true);
                  }}
                  className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"
                  title="Calendario de soporte (sábados)"
                >
                  <CalendarDaysIcon className="h-5 w-5" />
                </motion.button>
              )}

              <div className="relative" ref={notifRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNotifOpen((v) => !v);
                  }}
                  className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"
                  title="Notificaciones"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white shadow">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </motion.button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">Recientes</div>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                            onClick={() => markAllAsReadMutation.mutate()}
                          >
                            Marcar todas
                          </button>
                        )}
                      </div>

                      <div className="max-h-96 overflow-auto">
                        {isLoadingRecent ? (
                          <div className="p-4 text-sm text-gray-500">Cargando...</div>
                        ) : recentNotifications.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500">No hay notificaciones recientes.</div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {recentNotifications.map((n) => (
                              <button
                                key={n.id}
                                type="button"
                                onClick={async () => {
                                  const canMutate = !isSuperAdmin() || n.user_id === user?.id;
                                  if (canMutate && !n.is_read) {
                                    try {
                                      await markAsReadMutation.mutateAsync(n.id);
                                    } catch (_) {}
                                  }
                                  setNotifOpen(false);
                                  if (n.action_url) {
                                    navigate(n.action_url);
                                  } else {
                                    navigate('/notifications');
                                  }
                                }}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                                  !n.is_read ? 'bg-indigo-50/40' : ''
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                                      {!n.is_read && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
                                      {isSuperAdmin() && n.user && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                          {n.user.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">{n.message}</div>
                                    <div className="text-[11px] text-gray-500 mt-2 flex items-center gap-2">
                                      <span className="capitalize">{n.type}</span>
                                      <span>•</span>
                                      <span>{new Date(n.created_at).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <button
                          type="button"
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                          onClick={() => {
                            setNotifOpen(false);
                            navigate('/notifications');
                          }}
                        >
                          Ver todas
                        </button>
                        <div className="text-xs text-gray-500">
                          {unreadCount > 0 ? `${unreadCount} sin leer` : '0 sin leer'}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        <SupportCalendarModal open={supportCalendarOpen} onClose={() => setSupportCalendarOpen(false)} />
        <NotesWidget />

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

