import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, CubeIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AppLayout from '../layouts/AppLayout';
import apiClient from '../api/client';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import Alert from '../components/common/Alert';
import Input from '../components/common/Input';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    low_stock: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', page, filters],
    queryFn: async () => {
      const response = await apiClient.get('/inventory', {
        params: {
          page,
          per_page: 15,
          ...filters,
        },
      });
      return response.data;
    },
  });

  const columns = [
    {
      key: 'name',
      header: 'Producto',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.sku}</div>
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
      key: 'current_quantity',
      header: 'Stock Actual',
      render: (value, row) => {
        const isLowStock = value <= (row.minimum_stock || 0);
        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${
              isLowStock ? 'text-red-600' : 'text-gray-900'
            }`}>
              {formatNumber(value)} {row.unit}
            </span>
            {isLowStock && (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
            )}
          </div>
        );
      },
    },
    {
      key: 'minimum_stock',
      header: 'Stock Mínimo',
      render: (value, row) => (
        <span className="text-sm text-gray-500">
          {formatNumber(value)} {row.unit}
        </span>
      ),
    },
    {
      key: 'unit_cost',
      header: 'Costo Unitario',
      render: (value, row) => (
        <span className="text-sm text-gray-900">
          {formatCurrency(value, row.currency)}
        </span>
      ),
    },
    {
      key: 'total_value',
      header: 'Valor Total',
      render: (value, row) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency((row.current_quantity || 0) * (row.unit_cost || 0), row.currency)}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Ubicación',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Link
          to={`/inventory/${row.id}`}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          Ver detalles
        </Link>
      ),
    },
  ];

  const stats = data?.statistics || {};
  const lowStockItems = stats.low_stock_items || 0;

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventario</h1>
            <p className="mt-1 text-sm text-gray-500">
              Control de inventario y movimientos de stock
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/inventory/movements/create">
                <Button variant="outline" className="w-full sm:w-auto">
                  <span className="hidden sm:inline">Registrar Movimiento</span>
                  <span className="sm:hidden">Movimiento</span>
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link to="/inventory/create">
                <Button icon={PlusIcon} className="w-full sm:w-auto">
                  <span className="hidden sm:inline">Nuevo Producto</span>
                  <span className="sm:hidden">Nuevo</span>
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Alert */}
        {lowStockItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Alert variant="warning" title={`${lowStockItems} producto(s) con stock bajo`}>
              Tienes productos que están por debajo del stock mínimo configurado.
            </Alert>
          </motion.div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: CubeIcon, color: 'text-gray-400', label: 'Total Items', value: stats.total_items || 0, delay: 0.1 },
            { icon: CubeIcon, color: 'text-blue-400', label: 'Valor Total', value: formatCurrency(stats.total_value || 0), delay: 0.2 },
            { icon: ExclamationTriangleIcon, color: 'text-orange-400', label: 'Stock Bajo', value: lowStockItems, delay: 0.3 },
            { icon: CubeIcon, color: 'text-green-400', label: 'Movimientos (mes)', value: stats.movements_this_month || 0, delay: 0.4 },
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                icon={MagnifyingGlassIcon}
                placeholder="Buscar por nombre o SKU..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full"
              />
              <Input
                placeholder="Categoría..."
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="low_stock"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={filters.low_stock}
                  onChange={(e) => setFilters({ ...filters, low_stock: e.target.checked })}
                />
                <label htmlFor="low_stock" className="block text-sm text-gray-900">
                  Solo stock bajo
                </label>
              </div>
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
                icon={CubeIcon}
                title="No hay productos"
                description="Comienza registrando tu primer producto en inventario"
                action={
                  <Link to="/inventory/create">
                    <Button icon={PlusIcon}>Nuevo Producto</Button>
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
