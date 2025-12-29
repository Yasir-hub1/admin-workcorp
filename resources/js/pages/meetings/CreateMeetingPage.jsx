import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import { formatDateForInput } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateMeetingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_type: 'internal',
    area_id: '',
    agenda: '',
    meeting_link: '',
    send_reminders: true,
  });

  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener reunión si es edición
  const { data: meetingData, isLoading: loadingMeeting, error: meetingError } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/meetings/${id}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching meeting:', error);
        throw error;
      }
    },
    enabled: isEdit && !!id && isAuthenticated && !!user,
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

  // Obtener usuarios para el selector de asistentes
  const { data: usersData } = useQuery({
    queryKey: ['users-for-meetings'],
    queryFn: async () => {
      const users = [];
      try {
        const areasResponse = await apiClient.get('/areas');
        const areas = areasResponse.data.data || [];

        for (const area of areas) {
          try {
            const areaResponse = await apiClient.get(`/areas/${area.id}`);
            if (areaResponse.data.data?.staff) {
              users.push(...areaResponse.data.data.staff);
            }
          } catch (error) {
            // Ignorar errores individuales
          }
        }
      } catch (error) {
        console.error('Error obteniendo usuarios:', error);
      }

      const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );

      return uniqueUsers;
    },
    enabled: isAuthenticated && !!user,
  });

  // Actualizar formulario cuando se cargan los datos (solo una vez cuando se cargan)
  useEffect(() => {
    if (isEdit && meetingData && !loadingMeeting && !isFormInitialized) {
      if (meetingData.id || meetingData.title) {
        console.log('CreateMeetingPage - Initializing form with data:', meetingData);

        // Formatear fechas para datetime-local input
        const formatDateTimeForInput = (dateTime) => {
          if (!dateTime) return '';
          try {
            const date = new Date(dateTime);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          } catch (error) {
            console.error('Error formatting datetime:', error);
            return '';
          }
        };

        const newFormData = {
          title: meetingData.title || '',
          description: meetingData.description || '',
          start_time: formatDateTimeForInput(meetingData.start_time) || '',
          end_time: formatDateTimeForInput(meetingData.end_time) || '',
          location: meetingData.location || '',
          meeting_type: meetingData.meeting_type || 'internal',
          area_id: meetingData.area_id?.toString() || '',
          agenda: meetingData.agenda || '',
          meeting_link: meetingData.meeting_link || '',
          send_reminders: meetingData.send_reminders ?? true,
        };

        // Cargar asistentes
        if (meetingData.attendees && Array.isArray(meetingData.attendees) && usersData) {
          const attendees = meetingData.attendees
            .map(attendeeId => usersData.find(u => u.id === attendeeId))
            .filter(Boolean);
          setSelectedAttendees(attendees);
        }

        console.log('CreateMeetingPage - Setting form data:', newFormData);
        setFormData(newFormData);
        setIsFormInitialized(true);
        console.log('CreateMeetingPage - Form initialized successfully');
      } else {
        console.warn('CreateMeetingPage - meetingData does not have valid data:', meetingData);
      }
    }
  }, [meetingData, isEdit, loadingMeeting, isFormInitialized, usersData]);

  // Resetear flag cuando cambia el ID (nueva edición)
  useEffect(() => {
    if (id) {
      setIsFormInitialized(false);
    }
  }, [id]);

  // Mutation para crear/actualizar
  const mutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        const response = await apiClient.put(`/meetings/${id}`, data);
        return response.data;
      } else {
        const response = await apiClient.post('/meetings', data);
        return response.data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['meetings']);
      queryClient.invalidateQueries(['meeting', id]);
      toast.success(isEdit ? 'Reunión actualizada correctamente' : 'Reunión creada correctamente');
      navigate(isEdit ? `/meetings/${id}` : '/meetings');
    },
    onError: (error) => {
      const message = error.response?.data?.message || (isEdit ? 'Error al actualizar reunión' : 'Error al crear reunión');
      toast.error(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      title: formData.title,
      description: formData.description || null,
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location || null,
      meeting_type: formData.meeting_type,
      area_id: formData.area_id ? parseInt(formData.area_id) : null,
      attendees: selectedAttendees.map(a => a.id),
      agenda: formData.agenda || null,
      meeting_link: formData.meeting_link || null,
      send_reminders: formData.send_reminders,
    };

    // Limpiar campos vacíos
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === null) {
        delete submitData[key];
      }
    });

    mutation.mutate(submitData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleAddAttendee = (userId) => {
    if (!usersData) return;
    const user = usersData.find(u => u.id === parseInt(userId));
    if (user && !selectedAttendees.find(a => a.id === user.id)) {
      setSelectedAttendees([...selectedAttendees, user]);
    }
  };

  const handleRemoveAttendee = (userId) => {
    setSelectedAttendees(selectedAttendees.filter(a => a.id !== userId));
  };

  // Verificar permisos de edición
  const canEdit = !isEdit || (meetingData && (
    isSuperAdmin() ||
    meetingData.organizer_id === user?.id
  ));

  if (isEdit && loadingMeeting) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  if (isEdit && meetingError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/meetings')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Error al cargar reunión
              </h1>
            </div>
          </div>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {meetingError?.response?.data?.message || 'No se pudo cargar la reunión'}
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/meetings')}
              >
                Volver a Reuniones
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isEdit && !canEdit) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/meetings')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                No autorizado
              </h1>
            </div>
          </div>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No tienes permisos para editar esta reunión
              </p>
              <Button
                variant="outline"
                onClick={() => navigate(`/meetings/${id}`)}
              >
                Ver Reunión
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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(isEdit ? `/meetings/${id}` : '/meetings')}
            icon={ArrowLeftIcon}
          >
            Volver
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? 'Editar Reunión' : 'Nueva Reunión'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? 'Modifica los datos de la reunión' : 'Crea una nueva reunión'}
            </p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Título"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Ej: Reunión de equipo"
            />

            <Textarea
              label="Descripción"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Descripción de la reunión..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha y Hora Inicio"
                name="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={handleChange}
                required
              />
              <Input
                label="Fecha y Hora Fin"
                name="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={handleChange}
                required
                min={formData.start_time}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Ubicación"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Ej: Sala de juntas A"
              />
              <Select
                label="Tipo"
                name="meeting_type"
                value={formData.meeting_type}
                onChange={handleChange}
                required
                options={[
                  { value: 'internal', label: 'Interna' },
                  { value: 'external', label: 'Externa' },
                  { value: 'client', label: 'Con Cliente' },
                ]}
              />
            </div>

            {areasData && areasData.length > 0 && (
              <Select
                label="Área (Opcional)"
                name="area_id"
                value={formData.area_id}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Sin área' },
                  ...areasData.map(area => ({
                    value: area.id.toString(),
                    label: area.name,
                  })),
                ]}
              />
            )}

            <Input
              label="Enlace de la Reunión (Opcional)"
              name="meeting_link"
              type="url"
              value={formData.meeting_link}
              onChange={handleChange}
              placeholder="https://meet.google.com/..."
            />

            <Textarea
              label="Agenda"
              name="agenda"
              value={formData.agenda}
              onChange={handleChange}
              rows={4}
              placeholder="Puntos a tratar en la reunión..."
            />

            {/* Selector de Asistentes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asistentes (opcional)
              </label>
              <Select
                name="attendee_select"
                placeholder="Selecciona un asistente..."
                options={usersData?.filter(u => !selectedAttendees.find(a => a.id === u.id)).map(u => ({
                  value: u.id.toString(),
                  label: `${u.name} (${u.email})`,
                })) || []}
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddAttendee(e.target.value);
                    e.target.value = '';
                  }
                }}
              />

              {/* Lista de asistentes seleccionados */}
              {selectedAttendees.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500">Asistentes seleccionados:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedAttendees.map((attendee) => (
                      <span
                        key={attendee.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                      >
                        {attendee.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendee(attendee.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="send_reminders"
                name="send_reminders"
                checked={formData.send_reminders}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="send_reminders" className="ml-2 block text-sm text-gray-900">
                Enviar recordatorios
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(isEdit ? `/meetings/${id}` : '/meetings')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
              >
                {isEdit ? 'Actualizar Reunión' : 'Crear Reunión'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

