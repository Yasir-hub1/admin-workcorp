import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  LinkIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import { formatDate, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../../utils/notificationSound';
import useAuthStore from '../../store/authStore';

export default function MeetingDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  // Obtener reunión
  const { data: meetingData, isLoading: loadingMeeting, error: meetingError, refetch } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      try {
        console.log('Fetching meeting with id:', id);
        const response = await apiClient.get(`/meetings/${id}`);
        console.log('Meeting response:', response.data);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching meeting:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const meeting = meetingData;

  // Obtener usuarios para mostrar nombres de asistentes
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
  });

  // Debug logs
  console.log('MeetingDetailPage - id:', id);
  console.log('MeetingDetailPage - isAuthenticated:', isAuthenticated);
  console.log('MeetingDetailPage - user:', user);
  console.log('MeetingDetailPage - loadingMeeting:', loadingMeeting);
  console.log('MeetingDetailPage - meetingError:', meetingError);
  console.log('MeetingDetailPage - meeting:', meeting);

  // Verificar permisos
  const canEdit = meeting && (
    isSuperAdmin() ||
    meeting.organizer_id === user?.id
  );

  const canDelete = meeting && (
    isSuperAdmin() ||
    meeting.organizer_id === user?.id
  );

  // Mutation para reenviar notificación push
  const resendPushMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/meetings/${id}/resend-push`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Notificación push reenviada');
      playNotificationSound({ frequency: 740, durationMs: 110 });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al reenviar notificación');
    },
  });

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/meetings/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meetings']);
      toast.success('Reunión eliminada correctamente');
      navigate('/meetings');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar reunión');
    },
  });

  // Obtener nombres de asistentes
  const getAttendeeNames = () => {
    if (!meeting?.attendees || !Array.isArray(meeting.attendees) || !usersData) {
      return [];
    }
    
    return meeting.attendees
      .map(attendeeId => {
        const user = usersData.find(u => u.id === attendeeId);
        return user ? user.name : null;
      })
      .filter(Boolean);
  };

  const getStatusLabel = (status) => {
    const labels = {
      scheduled: 'Programada',
      in_progress: 'En Curso',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getMeetingTypeLabel = (type) => {
    const labels = {
      internal: 'Interna',
      external: 'Externa',
      client: 'Con Cliente',
    };
    return labels[type] || type;
  };

  // Loading state
  if (loadingMeeting) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (meetingError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {meetingError.response?.data?.message || 'Error al cargar la reunión'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/meetings')}>
            Volver a Reuniones
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No meeting found
  if (!meeting) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Reunión no encontrada
          </Alert>
          <Button variant="outline" onClick={() => navigate('/meetings')}>
            Volver a Reuniones
          </Button>
        </div>
      </AppLayout>
    );
  }

  const attendeeNames = getAttendeeNames();
  const duration = meeting.end_time && meeting.start_time
    ? Math.round((new Date(meeting.end_time) - new Date(meeting.start_time)) / 60000)
    : null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                {meeting.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {getMeetingTypeLabel(meeting.meeting_type)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(meeting.status)}>
              {getStatusLabel(meeting.status)}
            </Badge>
            {canEdit && Array.isArray(meeting.attendees) && meeting.attendees.length > 0 && (
              <Button
                variant="outline"
                onClick={() => resendPushMutation.mutate()}
                icon={PaperAirplaneIcon}
                loading={resendPushMutation.isPending}
              >
                Reenviar push
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/meetings/${id}/edit`)}
                icon={PencilIcon}
              >
                Editar
              </Button>
            )}
            {canDelete && meeting.status !== 'completed' && (
              <Button
                variant="danger"
                onClick={() => {
                  if (window.confirm('¿Estás seguro de eliminar esta reunión?')) {
                    deleteMutation.mutate();
                  }
                }}
                loading={deleteMutation.isPending}
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Información de la Reunión">
              <div className="space-y-4">
                {meeting.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descripción
                    </label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {meeting.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Fecha y Hora de Inicio
                    </label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {formatDateTime(meeting.start_time)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Fecha y Hora de Fin
                    </label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {formatDateTime(meeting.end_time)}
                      </p>
                    </div>
                  </div>

                  {duration && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Duración
                      </label>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{duration} minutos</p>
                      </div>
                    </div>
                  )}

                  {meeting.location && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Ubicación
                      </label>
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{meeting.location}</p>
                      </div>
                    </div>
                  )}

                  {meeting.meeting_link && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Enlace de la Reunión
                      </label>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                        <a
                          href={meeting.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-900"
                        >
                          {meeting.meeting_link}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {meeting.agenda && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Agenda
                    </label>
                    <div className="flex items-start gap-2">
                      <DocumentTextIcon className="h-4 w-4 text-gray-400 mt-1" />
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {meeting.agenda}
                      </p>
                    </div>
                  </div>
                )}

                {meeting.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Notas
                    </label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {meeting.notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Organizador">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {meeting.organizer?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {meeting.organizer?.email || ''}
                  </p>
                </div>
              </div>
            </Card>

            {meeting.area && (
              <Card title="Área">
                <p className="text-sm text-gray-900">{meeting.area.name}</p>
              </Card>
            )}

            {attendeeNames.length > 0 && (
              <Card title="Asistentes">
                <div className="space-y-2">
                  {attendeeNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                      <p className="text-sm text-gray-900">{name}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card title="Información Adicional">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado:</span>
                  <Badge className={getStatusColor(meeting.status)}>
                    {getStatusLabel(meeting.status)}
                  </Badge>
                </div>
                {meeting.send_reminders && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Recordatorios:</span>
                    <span className="text-gray-900">Activados</span>
                  </div>
                )}
                {meeting.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creada:</span>
                    <span className="text-gray-900">
                      {formatDate(meeting.created_at)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

