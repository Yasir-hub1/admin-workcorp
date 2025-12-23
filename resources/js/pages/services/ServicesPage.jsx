import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, Cog6ToothIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Alert from '../../components/common/Alert';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getStatusColor, getStatusLabel, debounce } from '../../utils/helpers';

export default function ServicesPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    billing_type: '',
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.category, filters.billing_type]);

  const { data, isLoading } = useQuery({
    queryKey: ['services', page, filters],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };

      // Solo agregar filtros si tienen valor
      if (filters.search && filters.search.trim()) params.search = filters.search.trim();
      if (filters.category && filters.category.trim()) params.category = filters.category.trim();
      if (filters.billing_type && filters.billing_type.trim()) params.billing_type = filters.billing_type.trim();

      const response = await apiClient.get('/services', { params });
      return response.data;
    },
  });

  // Obtener categorías únicas de los servicios
  const { data: categoriesData } = useQuery({
    queryKey: ['services-categories'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/services', {
          params: { per_page: 1000 },
        });
        const services = response.data.data || [];
        const uniqueCategories = [...new Set(services.map(s => s.category).filter(Boolean))];
        return uniqueCategories.sort();
      } catch (error) {
        console.error('Error obteniendo categorías:', error);
        return [];
      }
    },
  });

  const columns = [
    {
      key: 'name',
      header: 'Servicio',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value || '-'}</div>
          {row.code && (
            <div className="text-sm text-gray-500">Código: {row.code}</div>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || '-'}</span>
      ),
    },
    {
      key: 'price',
      header: 'Precio',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(value || 0)}
        </span>
      ),
    },
    {
      key: 'billing_type',
      header: 'Tipo Facturación',
      render: (value) => (
        <span className="text-sm text-gray-900">
          {value === 'monthly' ? 'Mensual' :
           value === 'annual' ? 'Anual' :
           value === 'project' ? 'Por Proyecto' : 'Por Hora'}
        </span>
      ),
    },
    {
      key: 'standard_duration',
      header: 'Duración',
      render: (value) => (
        <span className="text-sm text-gray-900">
          {value ? `${value} días` : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <Link
            to={`/services/${row.id}`}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Ver detalles
          </Link>
          <Link
            to={`/services/${row.id}/edit`}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Editar
          </Link>
        </div>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Servicios</h1>
            <p className="mt-1 text-sm text-gray-500">
              Catálogo de servicios disponibles
            </p>
          </div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to="/services/create">
              <Button icon={PlusIcon} className="w-full sm:w-auto">
                <span className="hidden sm:inline">Nuevo Servicio</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Cog6ToothIcon, color: 'text-gray-400', label: 'Total Servicios', value: stats.total_services || 0, delay: 0.1 },
            { icon: Cog6ToothIcon, color: 'text-blue-400', label: 'Categorías', value: stats.categories_count || 0, delay: 0.2 },
            { icon: Cog6ToothIcon, color: 'text-green-400', label: 'Valor Total', value: formatCurrency(stats.total_value || 0), delay: 0.3 },
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
          transition={{ delay: 0.6 }}
        >
          <Card>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                icon={MagnifyingGlassIcon}
                placeholder="Buscar por nombre, código o categoría..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full"
              />
              <Select
                placeholder="Todas las categorías"
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                options={[
                  { value: '', label: 'Todas las categorías' },
                  ...(categoriesData?.map(category => ({
                    value: category,
                    label: category,
                  })) || []),
                ]}
              />
              <Select
                placeholder="Todos los tipos"
                value={filters.billing_type}
                onChange={(e) => setFilters({ ...filters, billing_type: e.target.value })}
                options={[
                  { value: '', label: 'Todos los tipos' },
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'annual', label: 'Anual' },
                  { value: 'project', label: 'Por Proyecto' },
                  { value: 'hourly', label: 'Por Hora' },
                ]}
              />
            </div>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card padding={false} className="overflow-hidden">
            {!isLoading && data?.data?.length === 0 ? (
              <EmptyState
                icon={Cog6ToothIcon}
                title="No hay servicios"
                description="Comienza registrando tu primer servicio"
                action={
                  <Link to="/services/create">
                    <Button icon={PlusIcon}>Nuevo Servicio</Button>
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
