import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import AppLayout from '../layouts/AppLayout';
import useAuthStore from '../store/authStore';
import apiClient from '../api/client';
import {
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { isSuperAdmin, isJefeArea, isPersonal, isAuthenticated, user } = useAuthStore();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  // Fetch statistics - only when authenticated
  const { data: assetsStats } = useQuery({
    queryKey: ['assets', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/assets/statistics');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: expensesStats } = useQuery({
    queryKey: ['expenses', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/expenses/statistics');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: clientsStats } = useQuery({
    queryKey: ['clients', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/clients/statistics');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: servicesStats } = useQuery({
    queryKey: ['services', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/services/statistics');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: inventoryStats } = useQuery({
    queryKey: ['inventory', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/inventory/statistics');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
  });

  const stats = [
    {
      name: 'Activos',
      value: assetsStats?.total_assets || 0,
      change: assetsStats?.total_value || 0,
      changeType: 'currency',
      icon: BuildingOfficeIcon,
      href: '/assets',
      color: 'bg-blue-500',
    },
    {
      name: 'Gastos del Mes',
      value: expensesStats?.total_amount || 0,
      change: expensesStats?.pending_amount || 0,
      changeType: 'currency',
      icon: CurrencyDollarIcon,
      href: '/expenses',
      color: 'bg-green-500',
    },
    {
      name: 'Clientes Activos',
      value: clientsStats?.active_clients || 0,
      change: clientsStats?.total_clients || 0,
      changeType: 'number',
      icon: UserGroupIcon,
      href: '/clients',
      color: 'bg-purple-500',
    },
    {
      name: 'Servicios Activos',
      value: servicesStats?.active_services || 0,
      change: servicesStats?.expiring_soon || 0,
      changeType: 'number',
      icon: Cog6ToothIcon,
      href: '/services',
      color: 'bg-yellow-500',
    },
    {
      name: 'Items Inventario',
      value: inventoryStats?.total_items || 0,
      change: inventoryStats?.low_stock_items || 0,
      changeType: 'number',
      icon: CubeIcon,
      href: '/inventory',
      color: 'bg-red-500',
    },
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
    }).format(value);
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white"
        >
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold mb-2"
          >
            Bienvenido al Sistema de Gestión Empresarial
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-indigo-100"
          >
            {isSuperAdmin() && 'Panel de Super Administrador - Vista completa del sistema'}
            {isJefeArea() && 'Panel de Jefe de Área - Gestión de tu área'}
            {isPersonal() && 'Panel Personal - Tus actividades y responsabilidades'}
          </motion.p>
        </motion.div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-all cursor-pointer border border-gray-100"
              onClick={() => window.location.href = stat.href}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <motion.p
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                    className="mt-2 text-3xl font-bold text-gray-900"
                  >
                    {stat.changeType === 'currency' ? formatCurrency(stat.value) : stat.value}
                  </motion.p>
                  {stat.change > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className="mt-2 flex items-center text-sm"
                    >
                      {stat.changeType === 'currency' ? (
                        <span className="text-gray-500">
                          {stat.name === 'Gastos del Mes' ? 'Pendientes: ' : 'Total: '}
                          {formatCurrency(stat.change)}
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          {stat.name === 'Servicios Activos' ? 'Por vencer: ' : 'Total: '}
                          {stat.change}
                        </span>
                      )}
                    </motion.div>
                  )}
                </div>
                <motion.div
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                  className={`${stat.color} p-3 rounded-lg shadow-md`}
                >
                  <stat.icon className="h-8 w-8 text-white" />
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Servicios por vencer (solo con permiso de recordatorio) */}
        {(isSuperAdmin() || hasPermission('services.expiry-reminders')) &&
          Array.isArray(servicesStats?.expiring_services) &&
          servicesStats.expiring_services.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-lg shadow-md p-6 border border-yellow-100"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Servicios por vencer (próx. 15 días)</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Recordatorio push se envía (si tienes permiso) 7 y 1 día antes.
                </p>
              </div>
              <div className="text-sm text-gray-600">
                Total por vencer: <span className="font-semibold">{servicesStats.expiring_soon || 0}</span>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vence</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsable</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {servicesStats.expiring_services.map((s) => {
                    const clientName = s.client?.business_name || s.client?.legal_name || 'Cliente';
                    const dueIn = daysUntil(s.end_date);
                    const dueLabel = dueIn === null ? '-' : (dueIn <= 0 ? 'Hoy' : `${dueIn} día(s)`);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{s.name}</div>
                          {s.contract_amount !== null && s.contract_amount !== undefined && (
                            <div className="text-xs text-gray-500">Contrato: {formatCurrency(s.contract_amount)}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{clientName}</div>
                          {s.client?.phone && (
                            <div className="text-xs text-gray-500">Tel: {s.client.phone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{s.end_date || '-'}</div>
                          <div className={`text-xs ${dueIn !== null && dueIn <= 3 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {dueLabel}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{s.assigned_user?.name || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.client?.id ? (
                            <button
                              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              onClick={() => (window.location.href = `/clients/${s.client.id}?tab=kardex`)}
                            >
                              Ver cliente →
                            </button>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow-md p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { href: '/assets/create', icon: BuildingOfficeIcon, color: 'text-blue-500', label: 'Nuevo Activo' },
              { href: '/expenses/create', icon: CurrencyDollarIcon, color: 'text-green-500', label: 'Registrar Gasto' },
              { href: '/clients/create', icon: UserGroupIcon, color: 'text-purple-500', label: 'Nuevo Cliente' },
              { href: '/services/create', icon: Cog6ToothIcon, color: 'text-yellow-500', label: 'Nuevo Servicio' },
            ].map((action, index) => (
              <motion.a
                key={action.href}
                href={action.href}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ y: -4, scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all hover:shadow-md"
              >
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                >
                  <action.icon className={`h-8 w-8 ${action.color} mb-2`} />
                </motion.div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}

