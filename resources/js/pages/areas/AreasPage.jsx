import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, BuildingOffice2Icon, UsersIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Select from '../../components/common/Select';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function AreasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    is_active: '',
    parent_id: '',
  });

  // Obtener áreas para el select de área padre
  const { data: areasData } = useQuery({
    queryKey: ['areas-for-select'],
    queryFn: async () => {
      const response = await apiClient.get('/areas');
      return response.data.data || [];
    },
  });

  // Obtener personal para el select de jefes de área
  const { data: staffData } = useQuery({
    queryKey: ['staff-for-select'],
    queryFn: async () => {
      const response = await apiClient.get('/staff', {
        params: { is_active: true, per_page: 1000 },
      });
      return response.data.data || [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['areas', filters],
    queryFn: async () => {
      const params = {};
      if (filters.is_active) params.is_active = filters.is_active;
      if (filters.parent_id) {
        if (filters.parent_id === 'root') {
          params.root_only = true;
        } else {
          params.parent_id = filters.parent_id;
        }
      }
      const response = await apiClient.get('/areas', { params });
      return response.data;
    },
  });


  const columns = [
    {
      key: 'name',
      header: 'Área',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          {row.code && (
            <div className="text-sm text-gray-500">Código: {row.code}</div>
          )}
        </div>
      ),
    },
    {
      key: 'parent',
      header: 'Área Padre',
      render: (value) => (
        <span className="text-sm text-gray-900">{value?.name || 'Raíz'}</span>
      ),
    },
    {
      key: 'managers',
      header: 'Jefes de Área',
      render: (value) => {
        if (!value || value.length === 0) {
          return <span className="text-sm text-gray-500">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {value.map((manager, idx) => (
              <Badge key={idx} variant="info" className="text-xs">
                {manager.user?.name || manager.user?.email || '-'}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'budget_monthly',
      header: 'Presupuesto Mensual',
      render: (value) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(value || 0)}
        </span>
      ),
    },
    {
      key: 'is_active',
      header: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'success' : 'secondary'}>
          {value ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/areas/${row.id}`)}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Ver
          </button>
          <button
            onClick={() => navigate(`/areas/${row.id}/edit`)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Editar
          </button>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Áreas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona la estructura organizacional de la empresa
            </p>
          </div>
          <Button icon={PlusIcon} onClick={() => navigate('/areas/create')}>
            Nueva Área
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              placeholder="Todos los estados"
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              options={[
                { value: '', label: 'Todas' },
                { value: 'true', label: 'Activas' },
                { value: 'false', label: 'Inactivas' },
              ]}
            />
            <Select
              placeholder="Todas las áreas"
              value={filters.parent_id}
              onChange={(e) => setFilters({ ...filters, parent_id: e.target.value })}
              options={[
                { value: '', label: 'Todas' },
                { value: 'root', label: 'Solo raíz' },
                ...(areasData?.map(area => ({
                  value: area.id.toString(),
                  label: area.name,
                })) || []),
              ]}
            />
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={BuildingOffice2Icon}
              title="No hay áreas"
              description="Comienza creando la primera área de la empresa"
              action={
                <Button icon={PlusIcon} onClick={() => navigate('/areas/create')}>
                  Nueva Área
                </Button>
              }
            />
          ) : (
            <Table
              columns={columns}
              data={data?.data || []}
              loading={isLoading}
            />
          )}
        </Card>

      </div>
    </AppLayout>
  );
}
