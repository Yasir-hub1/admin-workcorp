import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, KeyIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import { debounce } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function PermissionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterModule, setFilterModule] = useState('');

  // Debounce search
  const debouncedSetSearch = useMemo(
    () => debounce((value) => setDebouncedSearch(value), 500),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSetSearch(value);
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['permissions', page, debouncedSearch, filterModule],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filterModule) params.module = filterModule;
      const response = await apiClient.get('/permissions', { params });
      return response.data;
    },
  });

  // Obtener módulos únicos
  const { data: modulesData } = useQuery({
    queryKey: ['permissions-modules'],
    queryFn: async () => {
      const response = await apiClient.get('/permissions/modules');
      return response.data.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/permissions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissions']);
      toast.success('Permiso eliminado correctamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar permiso');
    },
  });

  const columns = [
    {
      key: 'name',
      header: 'Permiso',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.display_name}</div>
          <div className="text-sm text-gray-500">{row.name}</div>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Módulo',
      render: (value) => (
        <Badge variant="info" className="capitalize">
          {value?.replace('_', ' ') || '-'}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Descripción',
      render: (value) => (
        <span className="text-sm text-gray-600">{value || '-'}</span>
      ),
    },
    {
      key: 'roles_count',
      header: 'Roles',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || 0}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/permissions/${row.id}`)}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Ver
          </button>
          <button
            onClick={() => navigate(`/permissions/${row.id}/edit`)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Editar
          </button>
          {row.roles_count === 0 && (
            <button
              onClick={() => {
                if (window.confirm('¿Estás seguro de eliminar este permiso?')) {
                  deleteMutation.mutate(row.id);
                }
              }}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Eliminar
            </button>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Permisos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los permisos del sistema
            </p>
          </div>
          <Button icon={PlusIcon} onClick={() => navigate('/permissions/create')}>
            Nuevo Permiso
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              placeholder="Buscar permisos..."
              value={search}
              onChange={handleSearchChange}
            />
            <Select
              placeholder="Todos los módulos"
              value={filterModule}
              onChange={(e) => {
                setFilterModule(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Todos' },
                ...((modulesData || []).map(module => ({
                  value: module,
                  label: module.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                })) || []),
              ]}
            />
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={KeyIcon}
              title="No hay permisos"
              description="Comienza creando el primer permiso del sistema"
              action={
                <Button icon={PlusIcon} onClick={() => navigate('/permissions/create')}>
                  Nuevo Permiso
                </Button>
              }
            />
          ) : (
            <Table
              columns={columns}
              data={data?.data || []}
              loading={isLoading}
              pagination={{
                currentPage: data?.meta?.current_page || 1,
                lastPage: data?.meta?.last_page || 1,
                total: data?.meta?.total || 0,
                onPageChange: setPage,
              }}
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

