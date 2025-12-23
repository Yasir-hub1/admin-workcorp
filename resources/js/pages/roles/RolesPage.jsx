import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
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

export default function RolesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

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
    queryKey: ['roles', page, debouncedSearch, filterLevel],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (filterLevel) params.level = filterLevel;
      const response = await apiClient.get('/roles', { params });
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/roles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Rol eliminado correctamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar rol');
    },
  });

  const columns = [
    {
      key: 'name',
      header: 'Rol',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.display_name}</div>
          <div className="text-sm text-gray-500">{row.name}</div>
        </div>
      ),
    },
    {
      key: 'level',
      header: 'Nivel',
      render: (value) => (
        <Badge
          variant={value === 1 ? 'danger' : value === 2 ? 'warning' : 'info'}
        >
          {value === 1 ? 'Super Admin' : value === 2 ? 'Jefe de Área' : 'Personal'}
        </Badge>
      ),
    },
    {
      key: 'permissions_count',
      header: 'Permisos',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || 0}</span>
      ),
    },
    {
      key: 'users_count',
      header: 'Usuarios',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || 0}</span>
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
      key: 'actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/roles/${row.id}`)}
            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
          >
            Ver
          </button>
          <button
            onClick={() => navigate(`/roles/${row.id}/edit`)}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            Editar
          </button>
          {!['super_admin', 'jefe_area', 'personal'].includes(row.name) && (
            <button
              onClick={() => {
                if (window.confirm('¿Estás seguro de eliminar este rol?')) {
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Roles</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona los roles y sus permisos del sistema
            </p>
          </div>
          <Button icon={PlusIcon} onClick={() => navigate('/roles/create')}>
            Nuevo Rol
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              placeholder="Buscar roles..."
              value={search}
              onChange={handleSearchChange}
            />
            <Select
              placeholder="Todos los niveles"
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setPage(1);
              }}
              options={[
                { value: '', label: 'Todos' },
                { value: '1', label: 'Super Admin' },
                { value: '2', label: 'Jefe de Área' },
                { value: '3', label: 'Personal' },
              ]}
            />
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={ShieldCheckIcon}
              title="No hay roles"
              description="Comienza creando el primer rol del sistema"
              action={
                <Button icon={PlusIcon} onClick={() => navigate('/roles/create')}>
                  Nuevo Rol
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

