import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, TicketIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';

export default function TicketsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: '',
  });

  const { data: ticketCategories } = useQuery({
    queryKey: ['ticket-categories', 'filters'],
    queryFn: async () => {
      const response = await apiClient.get('/tickets/categories');
      return response.data?.data || [];
    },
    retry: 1,
  });

  const getCategoryLabel = (value) => {
    const map = {
      it: 'TI',
      maintenance: 'Mantenimiento',
      hr: 'RRHH',
      finance: 'Finanzas',
      other: 'Otro',
    };
    return map[value] || value;
  };

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', page, filters],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };

      // Solo agregar filtros si tienen valor
      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.category) {
        params.category = filters.category;
      }

      if (filters.priority) {
        params.priority = filters.priority;
      }

      const response = await apiClient.get('/tickets', { params });
      return response.data;
    },
  });

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.category, filters.priority]);

  const { data: stats } = useQuery({
    queryKey: ['tickets', 'statistics'],
    queryFn: async () => {
      const response = await apiClient.get('/tickets/statistics');
      return response.data.data;
    },
  });

  const columns = [
    {
      key: 'ticket_number',
      header: 'Ticket',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.title}</div>
          {row.client?.business_name && (
            <div className="text-xs text-gray-400">
              Cliente: {row.client.business_name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (value) => (
        <Badge variant="secondary">
          {getCategoryLabel(value)}
        </Badge>
      ),
    },
    {
      key: 'priority',
      header: 'Prioridad',
      render: (value) => (
        <Badge
          variant={
            value === 'urgent' ? 'danger' :
            value === 'high' ? 'warning' :
            value === 'medium' ? 'info' : 'secondary'
          }
        >
          {value === 'urgent' ? 'Urgente' :
           value === 'high' ? 'Alta' :
           value === 'medium' ? 'Media' : 'Baja'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (value) => (
        <Badge
          variant={
            value === 'resolved' ? 'success' :
            value === 'in_progress' ? 'info' :
            value === 'open' ? 'warning' : 'secondary'
          }
        >
          {value === 'open' ? 'Abierto' :
           value === 'assigned' ? 'Asignado' :
           value === 'in_progress' ? 'En Progreso' :
           value === 'resolved' ? 'Resuelto' :
           value === 'closed' ? 'Cerrado' : 'Cancelado'}
        </Badge>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Asignado a',
      render: (value, row) => (
        <span className="text-sm text-gray-900">
          {row.assigned_to?.name || 'Sin asignar'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Fecha',
      render: (value) => (
        <span className="text-sm text-gray-500">{formatDate(value)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Link
          to={`/tickets/${row.id}`}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          Ver detalles
        </Link>
      ),
    },
  ];


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tickets de Soporte</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los tickets de soporte técnico
            </p>
          </div>
          <Button
            icon={PlusIcon}
            onClick={() => navigate('/tickets/create')}
          >
            Nuevo Ticket
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Card padding={false}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TicketIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Tickets
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats?.total || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Abiertos
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats?.open || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TicketIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      En Progreso
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats?.in_progress || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
          <Card padding={false}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TicketIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Resueltos
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats?.resolved || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || '' })}
              >
                <option value="">Todos los estados</option>
                <option value="open">Abierto</option>
                <option value="assigned">Asignado</option>
                <option value="in_progress">En Progreso</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || '' })}
              >
                <option value="">Todas las categorías</option>
                {(ticketCategories || []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prioridad
              </label>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filters.priority || ''}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value || '' })}
              >
                <option value="">Todas las prioridades</option>
                <option value="urgent">Urgente</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title="No hay tickets"
              description="Comienza creando tu primer ticket de soporte"
              action={
                <Button icon={PlusIcon} onClick={() => navigate('/tickets/create')}>
                  Nuevo Ticket
                </Button>
              }
            />
          ) : (
            <>
              <Table
                columns={columns}
                data={data?.data || []}
                loading={isLoading}
              />
              {data?.meta && data.meta.total > data.meta.per_page && (
                <Pagination
                  currentPage={data.meta.current_page}
                  totalPages={data.meta.last_page}
                  perPage={data.meta.per_page}
                  totalItems={data.meta.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

