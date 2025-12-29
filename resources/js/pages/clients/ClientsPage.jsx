import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, UserGroupIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { formatDate } from '../../utils/formatters';
import { getStatusColor, getStatusLabel, debounce } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';

export default function ClientsPage() {
  const { hasPermission, isSuperAdmin } = useAuthStore();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    type: '',
    category: '',
  });

  // Debounce para el filtro de búsqueda
  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setFilters(prev => ({ ...prev, search: value }));
      setPage(1);
    }, 500),
    []
  );

  // Actualizar búsqueda cuando cambia el input
  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput, debouncedSearch]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.type, filters.category]);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page, filters],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };

      // Solo agregar filtros si tienen valor
      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }

      if (filters.status && filters.status.trim()) {
        params.status = filters.status.trim();
      }

      if (filters.type && filters.type.trim()) {
        params.type = filters.type.trim();
      }

      if (filters.category && filters.category.trim()) {
        params.category = filters.category.trim();
      }

      const response = await apiClient.get('/clients', { params });
      return response.data;
    },
  });

  const canViewClients =
    isSuperAdmin()
    || hasPermission('clients.view-all')
    || hasPermission('clients.view-area')
    || hasPermission('clients.view-own');

  const canViewClientDetail =
    isSuperAdmin()
    || hasPermission('clients.view-detail')
    || canViewClients;

  const canCreateClient =
    isSuperAdmin()
    || hasPermission('clients.create');

  const columns = [
    {
      key: 'business_name',
      header: 'Cliente',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value || row.full_name}</div>
          <div className="text-sm text-gray-500">{row.tax_id}</div>
        </div>
      ),
    },
    {
      key: 'client_type',
      header: 'Tipo',
      render: (value) => {
        const typeMap = {
          'company': 'Empresa',
          'individual': 'Persona Natural',
        };
        return (
          <Badge variant="secondary">
            {typeMap[value] || value}
          </Badge>
        );
      },
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (value) => (
        <Badge variant={
          value === 'A' ? 'success' :
          value === 'B' ? 'warning' :
          value === 'C' ? 'secondary' : 'secondary'
        }>
          Categoría {value || 'N/A'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (value) => {
        // Mapear estados del backend al frontend
        const statusMap = {
          'active': 'activo',
          'inactive': 'inactivo',
          'prospect': 'prospecto',
          'lost': 'perdido',
        };
        const mappedStatus = statusMap[value] || value;
        return (
          <Badge className={getStatusColor(mappedStatus)}>
            {getStatusLabel(mappedStatus)}
          </Badge>
        );
      },
    },
    {
      key: 'email',
      header: 'Email',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || '-'}</span>
      ),
    },
    {
      key: 'phone',
      header: 'Teléfono',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || '-'}</span>
      ),
    },
    {
      key: 'assigned_user',
      header: 'Ejecutivo',
      render: (value, row) => (
        <span className="text-sm text-gray-900">
          {row.assigned_user?.name || row.assigned_to?.name || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        canViewClientDetail ? (
          <Link
            to={`/clients/${row.id}`}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Ver detalles
          </Link>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      ),
    },
  ];

  const stats = data?.statistics || {};

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona la cartera de clientes de la empresa
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {canCreateClient && (
              <Link to="/clients/create">
                <Button icon={PlusIcon} className="w-full sm:w-auto">
                  <span className="hidden sm:inline">Nuevo Cliente</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </Link>
            )}
          </motion.div>
        </motion.div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: UserGroupIcon, color: 'text-gray-400', label: 'Total Clientes', value: stats.total_clients || 0, delay: 0.1 },
            { icon: UserGroupIcon, color: 'text-green-400', label: 'Activos', value: stats.active_clients || 0, delay: 0.2 },
            { icon: UserGroupIcon, color: 'text-blue-400', label: 'Prospectos', value: stats.by_status?.prospecto || 0, delay: 0.3 },
            { icon: UserGroupIcon, color: 'text-gray-400', label: 'Inactivos', value: stats.by_status?.inactivo || 0, delay: 0.4 },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Card padding={false} className="h-full">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="flex-shrink-0"
                    >
                      <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 ${stat.color}`} />
                    </motion.div>
                    <div className="ml-4 sm:ml-5 w-0 flex-1 min-w-0">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          {stat.label}
                        </dt>
                        <dd className="text-base sm:text-lg font-semibold text-gray-900 mt-1 truncate">
                          {stat.value}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                icon={MagnifyingGlassIcon}
                placeholder="Buscar por nombre, RUC, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full"
              />
              <Select
                placeholder="Todos los estados"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                options={[
                  { value: '', label: 'Todos los estados' },
                  { value: 'active', label: 'Activo' },
                  { value: 'inactive', label: 'Inactivo' },
                  { value: 'prospect', label: 'Prospecto' },
                  { value: 'lost', label: 'Perdido' },
                ]}
              />
              <Select
                placeholder="Todos los tipos"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                options={[
                  { value: '', label: 'Todos los tipos' },
                  { value: 'empresa', label: 'Empresa' },
                  { value: 'persona_natural', label: 'Persona Natural' },
                ]}
              />
              <Select
                placeholder="Todas las categorías"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                options={[
                  { value: 'A', label: 'Categoría A' },
                  { value: 'B', label: 'Categoría B' },
                  { value: 'C', label: 'Categoría C' },
                ]}
              />
            </div>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card padding={false} className="overflow-hidden">
            {!isLoading && data?.data?.length === 0 ? (
              <EmptyState
                icon={UserGroupIcon}
                title="No hay clientes"
                description="Comienza registrando tu primer cliente"
                action={
                  <Link to="/clients/create">
                    <Button icon={PlusIcon}>Nuevo Cliente</Button>
                  </Link>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table
                    columns={columns}
                    data={data?.data || []}
                    loading={isLoading}
                  />
                </div>
                {data?.meta && data.meta.total > data.meta.per_page && (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                    <Pagination
                      currentPage={data.meta.current_page}
                      totalPages={data.meta.last_page}
                      perPage={data.meta.per_page}
                      totalItems={data.meta.total}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
