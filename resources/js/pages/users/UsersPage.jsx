import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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
import { debounce } from '../../utils/helpers';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    area_id: '',
    is_active: '',
    role: '',
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
  }, [filters.area_id, filters.is_active, filters.role]);

  // Obtener áreas para el filtro
  const { data: areasData } = useQuery({
    queryKey: ['areas-for-users-filter'],
    queryFn: async () => {
      const response = await apiClient.get('/areas');
      return response.data.data || [];
    },
  });

  // Obtener roles para el filtro
  const { data: rolesData } = useQuery({
    queryKey: ['roles-for-filter'],
    queryFn: async () => {
      // Los roles se pueden obtener desde el backend si hay un endpoint
      return [
        { name: 'super_admin', label: 'Super Admin' },
        { name: 'jefe_area', label: 'Jefe de Área' },
        { name: 'personal', label: 'Personal' },
      ];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, filters],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };

      if (filters.search && filters.search.trim()) {
        params.search = filters.search.trim();
      }

      if (filters.area_id && filters.area_id.trim()) {
        params.area_id = filters.area_id.trim();
      }

      if (filters.is_active && filters.is_active.trim()) {
        params.is_active = filters.is_active.trim();
      }

      if (filters.role && filters.role.trim()) {
        params.role = filters.role.trim();
      }

      const response = await apiClient.get('/users', { params });
      return response.data;
    },
  });

  const columns = [
    {
      key: 'name',
      header: 'Usuario',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value || '-'}</div>
          <div className="text-sm text-gray-500">{row.email || '-'}</div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Área',
      render: (value) => (
        <span className="text-sm text-gray-900">{value?.name || '-'}</span>
      ),
    },
    {
      key: 'staff',
      header: 'Personal',
      render: (value) => (
        <div>
          {value ? (
            <>
              <div className="text-sm font-medium text-gray-900">
                {value.employee_number ? `N° ${value.employee_number}` : 'Sin número'}
              </div>
              {value.position && (
                <div className="text-xs text-gray-500">{value.position}</div>
              )}
              {value.area && (
                <div className="text-xs text-gray-400">{value.area.name}</div>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400 italic">Sin personal asignado</span>
          )}
        </div>
      ),
    },
    {
      key: 'role_names',
      header: 'Roles',
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {value && value.length > 0 ? (
            value.map((role, idx) => (
              <Badge key={idx} variant="info" className="text-xs">
                {role === 'super_admin' ? 'Super Admin' :
                 role === 'jefe_area' ? 'Jefe de Área' : 'Personal'}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-gray-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'last_login_at',
      header: 'Último Acceso',
      render: (value) => (
        <span className="text-sm text-gray-900">
          {value ? formatDate(value) : 'Nunca'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Link
            to={`/users/${row.id}`}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Ver detalles
          </Link>
          <Link
            to={`/users/${row.id}/edit`}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Editar
          </Link>
        </div>
      ),
    },
  ];

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Usuarios</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los usuarios del sistema
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/users/create">
              <Button icon={PlusIcon} className="w-full sm:w-auto">
                <span className="hidden sm:inline">Nuevo Usuario</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                icon={MagnifyingGlassIcon}
                placeholder="Buscar por nombre, email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full"
              />
              <Select
                placeholder="Todas las áreas"
                value={filters.area_id}
                onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}
                options={[
                  { value: '', label: 'Todas las áreas' },
                  ...(areasData?.map(area => ({
                    value: area.id.toString(),
                    label: area.name,
                  })) || []),
                ]}
              />
              <Select
                placeholder="Todos los estados"
                value={filters.is_active}
                onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                options={[
                  { value: '', label: 'Todos los estados' },
                  { value: 'true', label: 'Activos' },
                  { value: 'false', label: 'Inactivos' },
                ]}
              />
              <Select
                placeholder="Todos los roles"
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                options={[
                  { value: '', label: 'Todos los roles' },
                  ...(rolesData?.map(role => ({
                    value: role.name,
                    label: role.label,
                  })) || []),
                ]}
              />
            </div>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card padding={false} className="overflow-hidden">
            {!isLoading && data?.data?.length === 0 ? (
              <EmptyState
                icon={UserIcon}
                title="No hay usuarios"
                description="Comienza registrando el primer usuario del sistema"
                action={
                  <Link to="/users/create">
                    <Button icon={PlusIcon}>Nuevo Usuario</Button>
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

