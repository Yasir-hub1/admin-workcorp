import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreatePermissionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    module: '',
    display_name: '',
    description: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener permiso si está en modo edición
  const { data: permissionData, isLoading: loadingPermission } = useQuery({
    queryKey: ['permission', id],
    queryFn: async () => {
      const response = await apiClient.get(`/permissions/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener módulos únicos
  const { data: modulesData } = useQuery({
    queryKey: ['permissions-modules'],
    queryFn: async () => {
      const response = await apiClient.get('/permissions/modules');
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del permiso
  useEffect(() => {
    if (isEditMode && permissionData && !isFormInitialized) {
      setFormData({
        name: permissionData.name || '',
        module: permissionData.module || '',
        display_name: permissionData.display_name || '',
        description: permissionData.description || '',
      });
      setIsFormInitialized(true);
    }
  }, [permissionData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/permissions', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['permissions']);
      toast.success('Permiso creado correctamente');
      navigate(`/permissions/${data.data.id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al crear permiso';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/permissions/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissions']);
      queryClient.invalidateQueries(['permission', id]);
      toast.success('Permiso actualizado correctamente');
      navigate(`/permissions/${id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al actualizar permiso';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      name: formData.name,
      module: formData.module,
      display_name: formData.display_name,
      description: formData.description || null,
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Módulos comunes del sistema
  const commonModules = [
    'users', 'roles', 'permissions', 'areas', 'staff', 'attendance',
    'requests', 'schedules', 'meetings', 'tickets', 'assets', 'expenses',
    'clients', 'services', 'inventory', 'notifications', 'reports',
  ];

  // Combinar módulos existentes con comunes
  const moduleOptions = [
    ...new Set([
      ...(modulesData || []),
      ...commonModules,
    ]),
  ].sort().map(module => ({
    value: module,
    label: module.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
  }));

  if (isEditMode && loadingPermission) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/permissions')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Permiso' : 'Nuevo Permiso'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del permiso' : 'Registra un nuevo permiso'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre del Permiso *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: users.create"
                helperText="Nombre técnico del permiso (formato: modulo.accion)"
              />
              <Input
                label="Nombre para Mostrar *"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
                placeholder="Ej: Crear Usuario"
              />
            </div>
            <Select
              label="Módulo *"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              required
              options={[
                { value: '', label: 'Seleccionar módulo...' },
                ...moduleOptions,
              ]}
              helperText="Módulo al que pertenece el permiso"
            />
            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe qué permite hacer este permiso"
            />

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/permissions')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar' : 'Crear'} Permiso
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

