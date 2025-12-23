import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

export default function ScheduleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, isSuperAdmin, hasPermission } = useAuthStore();

  const { data: schedule, isLoading, error } = useQuery({
    queryKey: ['schedule', id],
    queryFn: async () => {
      const response = await apiClient.get(`/schedules/${id}`);
      return response.data.data;
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const approveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/schedules/${id}/approve`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedule', id]);
      queryClient.invalidateQueries(['schedules']);
      toast.success('Horario aprobado correctamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al aprobar horario');
    },
  });

  const handleApprove = () => {
    if (window.confirm('¿Estás seguro de aprobar este horario?')) {
      approveMutation.mutate({});
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  if (error || !schedule) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/schedules')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Horario no encontrado
              </h1>
            </div>
          </div>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {error?.response?.data?.message || 'No se pudo cargar el horario'}
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/schedules')}
              >
                Volver a Horarios
              </Button>
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const canEdit = !schedule.is_approved && (schedule.user_id === user?.id || isSuperAdmin());
  const canApprove = !schedule.is_approved && (isSuperAdmin() || hasPermission('schedules.approve'));

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/schedules')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Detalle del Horario
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {schedule.month && new Date(schedule.month + '-01').toLocaleDateString('es-PE', { year: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/schedules/${id}/edit`)}
              >
                Editar
              </Button>
            )}
            {canApprove && (
              <Button
                onClick={handleApprove}
                loading={approveMutation.isPending}
                icon={CheckCircleIcon}
              >
                Aprobar
              </Button>
            )}
          </div>
        </div>

        {/* Información del Personal */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Personal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Nombre</label>
              <p className="text-sm text-gray-900 mt-1">{schedule.user?.name || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm text-gray-900 mt-1">{schedule.user?.email || '-'}</p>
            </div>
            {schedule.user?.area && (
              <div>
                <label className="text-sm font-medium text-gray-500">Área</label>
                <p className="text-sm text-gray-900 mt-1">{schedule.user.area.name}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Estado</label>
              <div className="mt-1">
                <Badge variant={schedule.is_approved ? 'success' : 'warning'}>
                  {schedule.is_approved ? 'Aprobado' : 'Pendiente'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Horarios por Día */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Horarios por Día de la Semana</h2>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => {
              const dayData = schedule.schedule_data?.[day.key];
              const isEnabled = dayData?.enabled ?? false;
              
              return (
                <div
                  key={day.key}
                  className={`border rounded-lg p-4 ${
                    isEnabled ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-4 w-4 rounded ${
                          isEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                        }`}
                      />
                      <span className="font-medium text-gray-900">{day.label}</span>
                    </div>
                    {isEnabled ? (
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">{dayData.start_time}</span>
                        {' - '}
                        <span className="font-medium">{dayData.end_time}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No laborable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Resumen */}
        {schedule.schedule_data && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="space-y-2 text-sm text-indigo-800">
                <div className="font-medium mb-2">Días laborables:</div>
                {DAYS_OF_WEEK.filter(day => schedule.schedule_data[day.key]?.enabled).map(day => {
                  const dayData = schedule.schedule_data[day.key];
                  return (
                    <div key={day.key}>
                      <span className="font-medium">{day.label}:</span>{' '}
                      {dayData.start_time} - {dayData.end_time}
                    </div>
                  );
                })}
                {DAYS_OF_WEEK.filter(day => schedule.schedule_data[day.key]?.enabled).length === 0 && (
                  <div className="text-indigo-600">No hay días habilitados</div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Información de Aprobación */}
        {schedule.is_approved && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Aprobación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Aprobado por</label>
                <p className="text-sm text-gray-900 mt-1">
                  {schedule.approved_by_user?.name || '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Fecha de Aprobación</label>
                <p className="text-sm text-gray-900 mt-1">
                  {schedule.approved_at ? formatDate(schedule.approved_at) : '-'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Notas */}
        {schedule.notes && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{schedule.notes}</p>
          </Card>
        )}

        {/* Información Adicional */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Adicional</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Creado</label>
              <p className="text-sm text-gray-900 mt-1">
                {schedule.created_at ? formatDate(schedule.created_at) : '-'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Última actualización</label>
              <p className="text-sm text-gray-900 mt-1">
                {schedule.updated_at ? formatDate(schedule.updated_at) : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

