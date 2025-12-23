import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, DocumentTextIcon, PencilIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';
import useAuthStore from '../../store/authStore';

export default function RequestsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['requests', page, filters],
    queryFn: async () => {
      const response = await apiClient.get('/requests', {
        params: {
          page,
          per_page: 15,
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, value]) => value !== '')
          ),
        },
      });
      return response.data;
    },
    enabled: isAuthenticated && !!user,
  });

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [filters.type, filters.status]);

  const columns = [
    {
      key: 'title',
      header: 'Solicitud',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">
            {row.type === 'permission' && 'Permiso'}
            {row.type === 'vacation' && 'Vacaciones'}
            {row.type === 'license' && 'Licencia'}
            {row.type === 'schedule_change' && 'Cambio de Horario'}
            {row.type === 'advance' && 'Adelanto'}
          </div>
        </div>
      ),
    },
    {
      key: 'start_date',
      header: 'Fecha Inicio',
      render: (value) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'end_date',
      header: 'Fecha Fin',
      render: (value) => (
        <span className="text-sm text-gray-900">{value ? formatDate(value) : '-'}</span>
      ),
    },
    {
      key: 'days_requested',
      header: 'Días',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (value) => (
        <Badge className={getStatusColor(value)}>
          {getStatusLabel(value)}
        </Badge>
      ),
    },
    {
      key: 'approved_by',
      header: 'Aprobado por',
      render: (value, row) => (
        <span className="text-sm text-gray-900">
          {row.approved_by_user?.name || '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (_, row) => {
        const canEdit = user && (
          isSuperAdmin() ||
          (hasPermission('requests.edit') && row.user_id === user.id && row.status === 'pending')
        );

        return (
          <div className="flex items-center gap-3">
            <Link
              to={`/requests/${row.id}`}
              className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
              Ver detalles
            </Link>
            {canEdit && (
              <Link
                to={`/requests/${row.id}/edit`}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-1"
              >
                <PencilIcon className="h-4 w-4" />
                Editar
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Solicitudes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona tus solicitudes de permisos, vacaciones y licencias
            </p>
          </div>
          <Link to="/requests/create">
            <Button icon={PlusIcon}>
              Nueva Solicitud
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Tipo de Solicitud"
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              options={[
                { value: '', label: 'Todos los tipos' },
                { value: 'permission', label: 'Permiso' },
                { value: 'vacation', label: 'Vacaciones' },
                { value: 'license', label: 'Licencia' },
                { value: 'schedule_change', label: 'Cambio de Horario' },
                { value: 'advance', label: 'Adelanto' },
              ]}
            />
            <Select
              label="Estado"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'approved', label: 'Aprobado' },
                { value: 'rejected', label: 'Rechazado' },
                { value: 'cancelled', label: 'Cancelado' },
              ]}
            />
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={DocumentTextIcon}
              title="No hay solicitudes"
              description="Comienza creando tu primera solicitud"
              action={
                <Link to="/requests/create">
                  <Button icon={PlusIcon}>Nueva Solicitud</Button>
                </Link>
              }
            />
          ) : (
            <>
              <Table
                columns={columns}
                data={data?.data || []}
                loading={isLoading}
              />
              {data?.meta && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <Pagination
                    currentPage={data.meta.current_page}
                    totalPages={data.meta.last_page}
                    totalItems={data.meta.total}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

