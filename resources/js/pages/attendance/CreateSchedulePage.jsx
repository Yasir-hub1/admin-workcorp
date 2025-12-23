import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes', short: 'Lun' },
  { key: 'tuesday', label: 'Martes', short: 'Mar' },
  { key: 'wednesday', label: 'Miércoles', short: 'Mié' },
  { key: 'thursday', label: 'Jueves', short: 'Jue' },
  { key: 'friday', label: 'Viernes', short: 'Vie' },
  { key: 'saturday', label: 'Sábado', short: 'Sáb' },
  { key: 'sunday', label: 'Domingo', short: 'Dom' },
];

export default function CreateSchedulePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEdit = !!id;

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [notes, setNotes] = useState('');
  const [scheduleData, setScheduleData] = useState({
    monday: { enabled: true, start_time: '08:00', end_time: '17:00' },
    tuesday: { enabled: true, start_time: '08:00', end_time: '17:00' },
    wednesday: { enabled: true, start_time: '08:00', end_time: '17:00' },
    thursday: { enabled: true, start_time: '08:00', end_time: '17:00' },
    friday: { enabled: true, start_time: '08:00', end_time: '17:00' },
    saturday: { enabled: false, start_time: '08:00', end_time: '17:00' },
    sunday: { enabled: false, start_time: '08:00', end_time: '17:00' },
  });

  // Obtener horario si es edición
  const { data: schedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ['schedule', id],
    queryFn: async () => {
      const response = await apiClient.get(`/schedules/${id}`);
      return response.data.data;
    },
    enabled: isEdit && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Actualizar formulario cuando se cargan los datos
  useEffect(() => {
    if (isEdit && schedule && !loadingSchedule) {
      if (schedule.month) {
        setSelectedMonth(schedule.month);
      }
      if (schedule.notes) {
        setNotes(schedule.notes);
      }
      if (schedule.schedule_data) {
        // Merge con valores por defecto
        const defaultSchedule = {
          monday: { enabled: true, start_time: '08:00', end_time: '17:00' },
          tuesday: { enabled: true, start_time: '08:00', end_time: '17:00' },
          wednesday: { enabled: true, start_time: '08:00', end_time: '17:00' },
          thursday: { enabled: true, start_time: '08:00', end_time: '17:00' },
          friday: { enabled: true, start_time: '08:00', end_time: '17:00' },
          saturday: { enabled: false, start_time: '08:00', end_time: '17:00' },
          sunday: { enabled: false, start_time: '08:00', end_time: '17:00' },
        };
        setScheduleData({ ...defaultSchedule, ...schedule.schedule_data });
      }
    }
  }, [schedule, isEdit, loadingSchedule]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        const response = await apiClient.put(`/schedules/${id}`, data);
        return response.data;
      } else {
        const response = await apiClient.post('/schedules', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']);
      toast.success(isEdit ? 'Horario actualizado correctamente' : 'Horario creado correctamente');
      navigate('/schedules');
    },
    onError: (error) => {
      const message = error.response?.data?.message || (isEdit ? 'Error al actualizar horario' : 'Error al crear horario');
      toast.error(message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    mutation.mutate({
      month: selectedMonth,
      schedule_data: scheduleData,
      notes: notes || null,
    });
  };

  const handleDayChange = (day, field, value) => {
    setScheduleData(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const copyToAllDays = (sourceDay) => {
    const sourceData = scheduleData[sourceDay];
    const newScheduleData = { ...scheduleData };
    DAYS_OF_WEEK.forEach(day => {
      if (day.key !== sourceDay) {
        newScheduleData[day.key] = {
          ...sourceData,
        };
      }
    });
    setScheduleData(newScheduleData);
    toast.success('Horario copiado a todos los días');
  };

  if (isEdit && loadingSchedule) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
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
            onClick={() => navigate('/schedules')}
            icon={ArrowLeftIcon}
          >
            Volver
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEdit ? 'Editar Horario' : 'Nuevo Horario Mensual'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? 'Modifica los horarios del mes' : 'Define los horarios de trabajo por día de la semana'}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mes */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mes <span className="text-red-500">*</span>
                </label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  required
                  disabled={isEdit}
                />
              </div>
            </div>

            {/* Horarios por día */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Horarios por Día de la Semana
                </label>
                <p className="text-xs text-gray-500">
                  Los horarios se aplicarán a todos los días del mes según el día de la semana
                </p>
              </div>

              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => {
                  const dayData = scheduleData[day.key];
                  return (
                    <div
                      key={day.key}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={dayData.enabled}
                            onChange={(e) => handleDayChange(day.key, 'enabled', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label className="text-sm font-medium text-gray-900">
                            {day.label}
                          </label>
                        </div>
                        {dayData.enabled && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToAllDays(day.key)}
                          >
                            Copiar a todos
                          </Button>
                        )}
                      </div>

                      {dayData.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-7">
                          <Input
                            label="Hora de Entrada"
                            type="time"
                            value={dayData.start_time}
                            onChange={(e) => handleDayChange(day.key, 'start_time', e.target.value)}
                            required
                          />
                          <Input
                            label="Hora de Salida"
                            type="time"
                            value={dayData.end_time}
                            onChange={(e) => handleDayChange(day.key, 'end_time', e.target.value)}
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notas */}
            <div>
              <Textarea
                label="Notas (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Agrega notas sobre este horario..."
              />
            </div>

            {/* Resumen */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-indigo-900 mb-2">
                Resumen del Horario
              </h3>
              <div className="space-y-1 text-sm text-indigo-800">
                {DAYS_OF_WEEK.filter(day => scheduleData[day.key].enabled).map(day => {
                  const dayData = scheduleData[day.key];
                  return (
                    <div key={day.key}>
                      <span className="font-medium">{day.label}:</span>{' '}
                      {dayData.start_time} - {dayData.end_time}
                    </div>
                  );
                })}
                {DAYS_OF_WEEK.filter(day => scheduleData[day.key].enabled).length === 0 && (
                  <div className="text-indigo-600">No hay días habilitados</div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/schedules')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={mutation.isPending}
                disabled={mutation.isPending}
              >
                {isEdit ? 'Actualizar Horario' : 'Guardar Horario'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

