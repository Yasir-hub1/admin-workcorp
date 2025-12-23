import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import MultiSelect from '../../components/common/MultiSelect';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateAreaPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    budget_monthly: '',
    budget_annual: '',
    phone: '',
    is_active: true,
    managers: [],
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener área si está en modo edición
  const { data: areaData, isLoading: loadingArea } = useQuery({
    queryKey: ['area', id],
    queryFn: async () => {
      const response = await apiClient.get(`/areas/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener personal activo para el select de jefes
  const { data: staffData } = useQuery({
    queryKey: ['staff-for-area-managers'],
    queryFn: async () => {
      const response = await apiClient.get('/staff', {
        params: { is_active: true, per_page: 1000 },
      });
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del área
  useEffect(() => {
    if (isEditMode && areaData && !isFormInitialized) {
      setFormData({
        name: areaData.name || '',
        code: areaData.code || '',
        description: areaData.description || '',
        budget_monthly: areaData.budget_monthly?.toString() || '',
        budget_annual: areaData.budget_annual?.toString() || '',
        phone: areaData.phone || '',
        is_active: areaData.is_active ?? true,
        managers: areaData.managers?.map(m => m.id.toString()) || [],
      });
      setIsFormInitialized(true);
    }
  }, [areaData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/areas', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['areas']);
      toast.success('Área creada correctamente');
      navigate(`/areas/${data.data.id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al crear área';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/areas/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['areas']);
      queryClient.invalidateQueries(['area', id]);
      toast.success('Área actualizada correctamente');
      navigate(`/areas/${id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al actualizar área';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      budget_monthly: formData.budget_monthly ? parseFloat(formData.budget_monthly) : 0,
      budget_annual: formData.budget_annual ? parseFloat(formData.budget_annual) : 0,
      phone: formData.phone || null,
      is_active: formData.is_active === true || formData.is_active === 'true',
      managers: formData.managers.map(id => parseInt(id)),
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Opciones para el MultiSelect de managers
  const managerOptions = useMemo(() => {
    if (!staffData) return [];
    return staffData.map(staff => {
      const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
      const displayName = fullName ||
                         staff.full_name ||
                         (staff.employee_number ? `N° ${staff.employee_number}` : 'Sin nombre');
      const position = staff.position ? ` - ${staff.position}` : '';
      return {
        value: staff.id.toString(),
        label: `${displayName}${position}`,
      };
    });
  }, [staffData]);

  if (isEditMode && loadingArea) {
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
              onClick={() => navigate('/areas')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Área' : 'Nueva Área'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del área' : 'Registra un nuevo área'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: Ventas"
              />
              <Input
                label="Código"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ej: VEN"
              />
            </div>
            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jefes de Área (Puede seleccionar uno o varios) *
              </label>
              <MultiSelect
                name="managers"
                value={formData.managers}
                onChange={(values) => setFormData({ ...formData, managers: values })}
                options={managerOptions}
                placeholder="Seleccionar jefes de área..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Presupuesto Mensual"
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_monthly}
                onChange={(e) => setFormData({ ...formData, budget_monthly: e.target.value })}
              />
              <Input
                label="Presupuesto Anual"
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_annual}
                onChange={(e) => setFormData({ ...formData, budget_annual: e.target.value })}
              />
            </div>
            <Input
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Área activa</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/areas')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar' : 'Crear'} Área
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

