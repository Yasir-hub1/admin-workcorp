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

export default function CreateServicePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    customCategory: '',
    price: '',
    billing_type: 'monthly',
    standard_duration: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener servicio si está en modo edición
  const { data: serviceData, isLoading: loadingService } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const response = await apiClient.get(`/services/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });



  // Obtener categorías únicas de servicios existentes
  const { data: existingCategoriesData } = useQuery({
    queryKey: ['existing-services-categories'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/services', {
          params: { per_page: 1000 },
        });
        const services = response.data.data || [];
        const uniqueCategories = [...new Set(services.map(s => s.category).filter(Boolean))];
        return uniqueCategories.sort();
      } catch (error) {
        console.error('Error obteniendo categorías existentes:', error);
        return [];
      }
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del servicio
  useEffect(() => {
    if (isEditMode && serviceData && !isFormInitialized) {
      setFormData({
        name: serviceData.name || '',
        code: serviceData.code || '',
        description: serviceData.description || '',
        category: serviceData.category || '',
        customCategory: '',
        price: serviceData.price?.toString() || '',
        billing_type: serviceData.billing_type || 'monthly',
        standard_duration: serviceData.standard_duration?.toString() || '',
      });
      setIsFormInitialized(true);
    }
  }, [serviceData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/services', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['services']);
      toast.success('Servicio creado correctamente');
      navigate(`/services/${data.data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear servicio');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/services/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
      queryClient.invalidateQueries(['service', id]);
      toast.success('Servicio actualizado correctamente');
      navigate(`/services/${id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar servicio');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || formData.name.trim() === '') {
      toast.error('El nombre del servicio es requerido');
      return;
    }

    // Si se seleccionó "Crear nueva categoría", usar el customCategory
    const serviceCategory = formData.category === '__custom__'
      ? formData.customCategory
      : formData.category;
    
    const submitData = {
      ...formData,
      name: formData.name.trim(),
      category: serviceCategory,
      price: formData.price ? parseFloat(formData.price) : null,
      billing_type: formData.billing_type || null,
      standard_duration: formData.standard_duration ? parseInt(formData.standard_duration) : null,
    };

    // Eliminar campos que no se deben enviar
    delete submitData.customCategory;

    // Limpiar campos vacíos
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === null || submitData[key] === undefined) {
        delete submitData[key];
      }
    });

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isEditMode && loadingService) {
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
              onClick={() => navigate('/services')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Servicio' : 'Nuevo Servicio'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del servicio' : 'Crea un nuevo servicio en el catálogo'}
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
                  label="Nombre del Servicio *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ingresa el nombre del servicio"
                />
                <Input
                  label="Código/SKU"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Código único del servicio"
                />
                <div>
                  <Select
                    label="Categoría"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    options={[
                      { value: '', label: 'Seleccionar categoría...' },
                      ...(existingCategoriesData?.map(category => ({
                        value: category,
                        label: category,
                      })) || []),
                      { value: '__custom__', label: '➕ Crear nueva categoría' },
                    ]}
                  />
                  {formData.category === '__custom__' && (
                    <div className="mt-2">
                      <Input
                        label="Nueva Categoría *"
                        value={formData.customCategory || ''}
                        onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                        required
                        placeholder="Ingresa el nombre de la nueva categoría"
                      />
                    </div>
                  )}
                </div>
                <Input
                  label="Precio Unitario"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Descripción"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descripción detallada del servicio"
                />
              </div>
            </div>



            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/services')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar Servicio' : 'Crear Servicio'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

