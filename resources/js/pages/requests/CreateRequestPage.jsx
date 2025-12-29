import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import { formatDate, formatDateForInput, calculateDaysBetween } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    days_requested: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener solicitud si es edición
  const { data: requestData, isLoading: loadingRequest, error: requestError } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/requests/${id}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching request:', error);
        throw error;
      }
    },
    enabled: isEdit && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Actualizar formulario cuando se cargan los datos (solo una vez cuando se cargan)
  useEffect(() => {
    if (isEdit && requestData && !loadingRequest && !isFormInitialized) {
      // Verificar que requestData tenga datos válidos
      if (requestData.id || requestData.title) {
        console.log('CreateRequestPage - Initializing form with data:', requestData);

        const newFormData = {
          type: requestData.type || '',
          title: requestData.title || '',
          description: requestData.description || '',
          start_date: formatDateForInput(requestData.start_date) || '',
          end_date: formatDateForInput(requestData.end_date) || '',
          start_time: requestData.start_time || '',
          end_time: requestData.end_time || '',
          days_requested: requestData.days_requested?.toString() || '',
        };

        // Recalcular días si hay fechas
        if (newFormData.start_date) {
          const calculatedDays = calculateDaysBetween(newFormData.start_date, newFormData.end_date);
          newFormData.days_requested = calculatedDays.toString();
        }

        console.log('CreateRequestPage - Setting form data:', newFormData);
        setFormData(newFormData);
        setIsFormInitialized(true);
        console.log('CreateRequestPage - Form initialized successfully');
      } else {
        console.warn('CreateRequestPage - requestData does not have valid data:', requestData);
      }
    }
  }, [requestData, isEdit, loadingRequest, isFormInitialized]);

  // Resetear flag cuando cambia el ID (nueva edición)
  useEffect(() => {
    if (id) {
      setIsFormInitialized(false);
    }
  }, [id]);

  // Obtener áreas (para admin)
  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await apiClient.get('/areas');
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Calcular días automáticamente cuando cambian las fechas
  useEffect(() => {
    if (formData.start_date) {
      const calculatedDays = calculateDaysBetween(formData.start_date, formData.end_date);
      setFormData(prev => {
        // Solo actualizar si el valor calculado es diferente al actual
        if (prev.days_requested !== calculatedDays.toString()) {
          return { ...prev, days_requested: calculatedDays.toString() };
        }
        return prev;
      });
    } else {
      // Si no hay fecha inicio, limpiar días
      setFormData(prev => {
        if (prev.days_requested) {
          return { ...prev, days_requested: '' };
        }
        return prev;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.start_date, formData.end_date]);

  // Mutation para crear/actualizar
  const mutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        const response = await apiClient.put(`/requests/${id}`, data);
        return response.data;
      } else {
        const response = await apiClient.post('/requests', data);
        return response.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['requests']);
      toast.success(isEdit ? 'Solicitud actualizada correctamente' : 'Solicitud creada correctamente');
      navigate('/requests');
    },
    onError: (error) => {
      const message = error.response?.data?.message || (isEdit ? 'Error al actualizar solicitud' : 'Error al crear solicitud');
      toast.error(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      days_requested: formData.days_requested ? parseInt(formData.days_requested) : null,
    };

    // Limpiar campos vacíos
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '') {
        delete submitData[key];
      }
    });

    mutation.mutate(submitData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // El cálculo de días se hace automáticamente con useEffect
  };

  if (isEdit && loadingRequest) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  if (isEdit && requestError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/requests')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Error al cargar solicitud
              </h1>
            </div>
          </div>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {requestError?.response?.data?.message || 'No se pudo cargar la solicitud'}
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/requests')}
              >
                Volver a Solicitudes
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/requests')}
            icon={ArrowLeftIcon}
          >
            Volver
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? 'Editar Solicitud' : 'Nueva Solicitud'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? 'Modifica los datos de tu solicitud' : 'Completa el formulario para crear una nueva solicitud'}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Select
                label="Tipo de Solicitud"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                disabled={isEdit}
                options={[
                  { value: 'permission', label: 'Permiso' },
                  { value: 'vacation', label: 'Vacaciones' },
                  { value: 'license', label: 'Licencia' },
                  { value: 'schedule_change', label: 'Cambio de Horario' },
                  { value: 'advance', label: 'Adelanto' },
                ]}
              />

              <Input
                label="Título"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Ej: Permiso médico"
              />
            </div>

            <Textarea
              label="Descripción"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Describe el motivo de tu solicitud..."
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Input
                label="Fecha de Inicio"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                required
              />

              <Input
                label="Fecha de Fin"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                min={formData.start_date}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Input
                label="Hora de Inicio"
                name="start_time"
                type="time"
                value={formData.start_time}
                onChange={handleChange}
                helperText="Opcional"
              />

              <Input
                label="Hora de Fin"
                name="end_time"
                type="time"
                value={formData.end_time}
                onChange={handleChange}
                helperText="Opcional"
              />

              <Input
                label="Días Solicitados"
                name="days_requested"
                type="number"
                value={formData.days_requested}
                onChange={handleChange}
                min="0"
                helperText="Se calcula automáticamente si no se especifica"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/requests')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={mutation.isPending}
              >
                {isEdit ? 'Actualizar Solicitud' : 'Crear Solicitud'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

