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
import MultiSelect from '../../components/common/MultiSelect';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateRolePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    level: '3',
    permissions: [],
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener rol si está en modo edición
  const { data: roleData, isLoading: loadingRole } = useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      const response = await apiClient.get(`/roles/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener todos los permisos agrupados por módulo
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: async () => {
      const response = await apiClient.get('/roles/permissions');
      return response.data.data || {};
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del rol
  useEffect(() => {
    if (isEditMode && roleData && !isFormInitialized) {
      setFormData({
        name: roleData.name || '',
        display_name: roleData.display_name || '',
        description: roleData.description || '',
        level: roleData.level?.toString() || '3',
        permissions: roleData.permissions?.map(p => p.id.toString()) || [],
      });
      setIsFormInitialized(true);
    }
  }, [roleData, isEditMode, isFormInitialized]);

  // Preparar opciones de permisos para MultiSelect
  const permissionOptions = Object.entries(permissionsData || {}).flatMap(([module, perms]) => {
    return perms.map(perm => ({
      value: perm.id.toString(),
      label: `${perm.display_name} (${module})`,
      module,
    }));
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/roles', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Rol creado correctamente');
      navigate(`/roles/${data.data.id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al crear rol';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      queryClient.invalidateQueries(['role', id]);
      toast.success('Rol actualizado correctamente');
      navigate(`/roles/${id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al actualizar rol';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      name: formData.name,
      display_name: formData.display_name,
      description: formData.description || null,
      level: parseInt(formData.level),
      permissions: formData.permissions.map(id => parseInt(id)),
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isEditMode && loadingRole) {
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
              onClick={() => navigate('/roles')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Rol' : 'Nuevo Rol'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del rol' : 'Registra un nuevo rol'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre del Rol *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: editor"
                helperText="Nombre técnico del rol (sin espacios, minúsculas)"
              />
              <Input
                label="Nombre para Mostrar *"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
                placeholder="Ej: Editor"
              />
            </div>
            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <Select
              label="Nivel *"
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              required
              options={[
                { value: '1', label: 'Super Admin' },
                { value: '2', label: 'Jefe de Área' },
                { value: '3', label: 'Personal' },
              ]}
              helperText="El nivel determina la jerarquía del rol"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permisos *
              </label>
              <MultiSelect
                name="permissions"
                value={formData.permissions}
                onChange={(values) => setFormData({ ...formData, permissions: values })}
                options={permissionOptions}
                placeholder="Seleccionar permisos..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Selecciona los permisos que tendrá este rol. Los permisos definen qué acciones puede realizar el usuario.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/roles')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar' : 'Crear'} Rol
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

