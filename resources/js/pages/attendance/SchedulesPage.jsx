import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon, CalendarIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function SchedulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [filterApproved, setFilterApproved] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['schedules', page, selectedMonth, filterApproved],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };

      // Solo agregar month si está seleccionado
      if (selectedMonth) {
        params.month = selectedMonth;
      }

      // Solo agregar is_approved si está seleccionado
      if (filterApproved !== '') {
        params.is_approved = filterApproved === 'true';
      }

      const response = await apiClient.get('/schedules', { params });
      return response.data;
    },
  });

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [selectedMonth, filterApproved]);


  const approveMutation = useMutation({
    mutationFn: async (scheduleId) => {
      const response = await apiClient.post(`/schedules/${scheduleId}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
      toast.success('Horario aprobado');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al aprobar horario');
    },
  });

  const columns = [
    {
      key: 'user',
      header: 'Personal',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.user?.name || '-'}</div>
          <div className="text-sm text-gray-500">{row.user?.email || '-'}</div>
          {row.user?.area && (
            <div className="text-xs text-gray-400 mt-1">
              Área: {row.user.area.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'month',
      header: 'Mes',
      render: (value) => (
        <span className="text-sm text-gray-900">
          {new Date(value + '-01').toLocaleDateString('es-PE', { year: 'numeric', month: 'long' })}
        </span>
      ),
    },
    {
      key: 'is_approved',
      header: 'Estado',
      render: (value, row) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Aprobado' : 'Pendiente'}
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
      key: 'approved_at',
      header: 'Fecha Aprobación',
      render: (value) => (
        <span className="text-sm text-gray-500">
          {value ? formatDate(value) : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/schedules/${row.id}`}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Ver
          </Link>
          {!row.is_approved && (
            <>
              <Link
                to={`/schedules/${row.id}/edit`}
                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              >
                Editar
              </Link>
              <button
                onClick={() => approveMutation.mutate(row.id)}
                className="text-green-600 hover:text-green-900 text-sm font-medium"
              >
                Aprobar
              </button>
            </>
          )}
        </div>
      ),
    },
  ];


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Horarios</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los horarios mensuales del personal
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Todos los meses"
            />
            <select
              value={filterApproved}
              onChange={(e) => setFilterApproved(e.target.value)}
              className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="true">Aprobados</option>
              <option value="false">Pendientes</option>
            </select>
            <Button
              icon={PlusIcon}
              onClick={() => navigate('/schedules/create')}
            >
              Nuevo Horario
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Card padding={false}>
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CalendarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Horarios
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {data?.meta?.total || 0}
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
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Aprobados
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {data?.data?.filter(s => s.is_approved).length || 0}
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
                  <XCircleIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pendientes
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {data?.data?.filter(s => !s.is_approved).length || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card padding={false}>
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No hay horarios"
              description="Comienza creando un horario para este mes"
              action={
                <Button icon={PlusIcon} onClick={() => navigate('/schedules/create')}>
                  Nuevo Horario
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

