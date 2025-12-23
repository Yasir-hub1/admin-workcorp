import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, CurrencyDollarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getStatusColor, getStatusLabel, debounce } from '../../utils/helpers';

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    start_date: '',
    end_date: '',
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
  }, [filters.status, filters.category, filters.start_date, filters.end_date]);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, filters],
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

      if (filters.category && filters.category.trim()) {
        params.category = filters.category.trim();
      }

      if (filters.start_date) {
        params.start_date = filters.start_date;
      }

      if (filters.end_date) {
        params.end_date = filters.end_date;
      }

      const response = await apiClient.get('/expenses', { params });
      return response.data;
    },
  });

  const columns = [
    {
      key: 'description',
      header: 'Descripción',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.category}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      render: (value, row) => (
        <div>
          <div className="font-semibold text-gray-900">
            {formatCurrency(value, row.currency)}
          </div>
        </div>
      ),
    },
    {
      key: 'expense_date',
      header: 'Fecha',
      render: (value) => (
        <span className="text-sm text-gray-900">
          {value ? formatDate(value) : '-'}
        </span>
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
      key: 'status',
      header: 'Estado',
      render: (value) => {
        // Mapear estados del backend al frontend
        const statusMap = {
          'pending': 'pendiente',
          'approved': 'aprobado',
          'rejected': 'rechazado',
          'paid': 'pagado',
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
      key: 'is_paid',
      header: 'Pago',
      render: (value) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Pagado' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      key: 'requested_by',
      header: 'Solicitante',
      render: (value) => (
        <span className="text-sm text-gray-900">{value?.name || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Link
          to={`/expenses/${row.id}`}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          Ver detalles
        </Link>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gastos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los gastos y solicita aprobaciones
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/expenses/create">
              <Button icon={PlusIcon} className="w-full sm:w-auto">
                <span className="hidden sm:inline">Registrar Gasto</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CurrencyDollarIcon, color: 'text-gray-400', label: 'Total Gastos', value: formatCurrency(stats.total_amount || 0), delay: 0.1 },
            { icon: CurrencyDollarIcon, color: 'text-yellow-400', label: 'Pendientes', value: formatCurrency(stats.pending_amount || 0), delay: 0.2 },
            { icon: CurrencyDollarIcon, color: 'text-green-400', label: 'Aprobados', value: formatCurrency(stats.approved_amount || 0), delay: 0.3 },
            { icon: CurrencyDollarIcon, color: 'text-blue-400', label: 'Pagados', value: formatCurrency(stats.paid_amount || 0), delay: 0.4 },
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                icon={MagnifyingGlassIcon}
                placeholder="Buscar..."
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
                  { value: 'pending', label: 'Pendiente' },
                  { value: 'approved', label: 'Aprobado' },
                  { value: 'rejected', label: 'Rechazado' },
                  { value: 'paid', label: 'Pagado' },
                ]}
              />
              <Input
                placeholder="Categoría..."
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full"
              />
              <Input
                type="date"
                placeholder="Desde..."
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full"
              />
              <Input
                type="date"
                placeholder="Hasta..."
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full"
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
                icon={CurrencyDollarIcon}
                title="No hay gastos"
                description="Comienza registrando tu primer gasto"
                action={
                  <Link to="/expenses/create">
                    <Button icon={PlusIcon}>Registrar Gasto</Button>
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
