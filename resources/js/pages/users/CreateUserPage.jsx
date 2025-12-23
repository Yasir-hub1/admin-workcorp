import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateUserPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    area_id: '',
    staff_id: '',
    is_active: true,
    language: 'es',
    timezone: 'America/La_Paz',
    roles: [],
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener usuario si está en modo edición
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await apiClient.get(`/users/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener áreas
  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await apiClient.get('/areas');
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Obtener personal sin usuario asignado (para crear)
  const { data: staffData } = useQuery({
    queryKey: ['staff-without-user'],
    queryFn: async () => {
      const response = await apiClient.get('/staff', {
        params: { is_active: true, per_page: 1000 },
      });
      // Filtrar solo los que no tienen usuario
      return (response.data.data || []).filter(s => !s.user_id);
    },
    enabled: isAuthenticated && !!user && !isEditMode,
  });

  // Obtener todo el personal (para editar - incluyendo el que ya tiene usuario)
  const { data: allStaffData } = useQuery({
    queryKey: ['all-staff-for-users'],
    queryFn: async () => {
      const response = await apiClient.get('/staff', {
        params: { per_page: 1000 },
      });
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user && isEditMode,
  });

  // Obtener roles disponibles
  const rolesOptions = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'jefe_area', label: 'Jefe de Área' },
    { value: 'personal', label: 'Personal' },
  ];

  // Inicializar formulario con datos del usuario
  useEffect(() => {
    if (isEditMode && userData && !isFormInitialized) {
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        password: '',
        password_confirmation: '',
        area_id: userData.area?.id?.toString() || '',
        staff_id: userData.staff?.id?.toString() || '',
        is_active: userData.is_active ?? true,
        language: userData.language || 'es',
        timezone: userData.timezone || 'America/La_Paz',
        roles: userData.role_names || [],
      });
      setIsFormInitialized(true);
    }
  }, [userData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/users', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['users']);
      toast.success('Usuario creado correctamente');
      navigate(`/users/${data.data.id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al crear usuario';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['user', id]);
      toast.success('Usuario actualizado correctamente');
      navigate(`/users/${id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al actualizar usuario';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      area_id: formData.area_id ? parseInt(formData.area_id) : null,
      staff_id: formData.staff_id ? parseInt(formData.staff_id) : null,
      is_active: formData.is_active === true || formData.is_active === 'true',
    };

    // Limpiar campos vacíos
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === null) {
        delete submitData[key];
      }
    });

    // Si no hay password en edición, no enviarlo
    if (isEditMode && !submitData.password) {
      delete submitData.password;
      delete submitData.password_confirmation;
    }

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleRoleToggle = (roleName) => {
    setFormData(prev => {
      const roles = prev.roles || [];
      if (roles.includes(roleName)) {
        return { ...prev, roles: roles.filter(r => r !== roleName) };
      } else {
        return { ...prev, roles: [...roles, roleName] };
      }
    });
  };

  if (isEditMode && loadingUser) {
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
              onClick={() => navigate('/users')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del usuario' : 'Registra un nuevo usuario en el sistema'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nombre *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Nombre completo"
                />
                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="email@ejemplo.com"
                />
                <Input
                  label={isEditMode ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!isEditMode}
                  placeholder="Mínimo 8 caracteres"
                />
                <Input
                  label={isEditMode ? 'Confirmar Nueva Contraseña' : 'Confirmar Contraseña *'}
                  type="password"
                  value={formData.password_confirmation}
                  onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                  required={!isEditMode}
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>

            {/* Asignación */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Asignación</h2>
              {!isEditMode && (
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                  <p className="text-sm text-indigo-800">
                    <strong>Importante:</strong> Selecciona el personal al que pertenece este usuario. Solo se muestran los miembros del personal que aún no tienen una cuenta de usuario asignada.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Personal *"
                  value={formData.staff_id}
                  onChange={(e) => {
                    const selectedStaff = (isEditMode ? allStaffData : staffData)?.find(s => s.id.toString() === e.target.value);
                    console.log(selectedStaff);
                    setFormData({
                      ...formData,
                      staff_id: e.target.value,
                      // Auto-completar nombre y área si se selecciona personal
                      name: selectedStaff?.first_name + ' ' + selectedStaff?.last_name || (selectedStaff?.employee_number ? `Personal N° ${selectedStaff.employee_number}` : formData.name),
                      area_id: selectedStaff?.area_id?.toString() || formData.area_id,
                    });
                  }}
                  required={!isEditMode}
                  options={[
                    { value: '', label: isEditMode ? 'Sin personal asignado' : 'Seleccionar personal...' },
                    ...((isEditMode ? allStaffData : staffData)?.map(staff => ({
                      value: staff.id.toString(),
                      label: `${staff.first_name || ''} ${staff.last_name || ''}`.trim() ||
                             (staff.full_name || 'Sin nombre') +
                             (staff.employee_number ? ` (N° ${staff.employee_number})` : '') +
                             (staff.position ? ` - ${staff.position}` : '') +
                             (staff.area ? ` (${staff.area.name})` : ''),
                    })) || []),
                  ]}
                  helperText={isEditMode ? "Asigna o cambia el personal asociado" : "Selecciona el personal al que pertenece este usuario"}
                />
                <Select
                  label="Área"
                  value={formData.area_id}
                  onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar área' },
                    ...(areasData?.map(area => ({
                      value: area.id.toString(),
                      label: area.name,
                    })) || []),
                  ]}
                  helperText="Se puede asignar automáticamente si seleccionas un personal"
                />
              </div>
            </div>

            {/* Roles */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Roles</h2>
              <div className="space-y-2">
                {rolesOptions.map((role) => (
                  <label key={role.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.roles.includes(role.value)}
                      onChange={() => handleRoleToggle(role.value)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Configuración */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Idioma"
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  options={[
                    { value: 'es', label: 'Español' },
                    { value: 'en', label: 'English' },
                  ]}
                />
                <Select
                  label="Zona Horaria"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  options={[
                    { value: 'America/La_Paz', label: 'La Paz (GMT-4)' },
                    { value: 'America/Lima', label: 'Lima (GMT-5)' },
                    { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
                    { value: 'America/Santiago', label: 'Santiago (GMT-3)' },
                    { value: 'America/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
                  ]}
                />
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Usuario activo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/users')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar' : 'Crear'} Usuario
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

