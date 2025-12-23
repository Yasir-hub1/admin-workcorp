import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  MapPinIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

// Función para obtener la etiqueta (simplificada - solo Entrada o Salida)
const getTypeLabel = (type) => {
  return type === 'check_in' ? 'Entrada' : 'Salida';
};

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markType, setMarkType] = useState(null); // 'check_in' o 'check_out'
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Obtener asistencia de hoy con todos los registros
  const { data: todayData, isLoading: loadingToday } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const response = await apiClient.get('/attendance/today');
      return response.data;
    },
    enabled: isAuthenticated && !!user,
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  const todayAttendance = todayData?.data;
  const nextMarkType = todayData?.next_mark_type || 'check_in';
  const records = todayAttendance?.records || [];

  // Obtener historial
  const { data: attendanceHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['attendance', 'history', selectedDate],
    queryFn: async () => {
      const response = await apiClient.get('/attendance', {
        params: {
          start_date: selectedDate,
          end_date: selectedDate,
        },
      });
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Obtener ubicación del usuario
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation(`${lat}, ${lng}`);
        },
        () => {
          setLocation('No disponible');
        }
      );
    } else {
      setLocation('No disponible');
    }
  };

  // Mutation para marcar asistencia
  const markMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/attendance/mark', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['attendance']);
      toast.success(data.message || 'Marcación registrada correctamente');
      setShowMarkModal(false);
      setLocation('');
      setNotes('');
      setMarkType(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al registrar marcación');
    },
  });

  const handleOpenMarkModal = (type = null) => {
    const typeToUse = type || nextMarkType;
    setMarkType(typeToUse);
    getLocation();
    setShowMarkModal(true);
  };

  const handleMark = () => {
    markMutation.mutate({
      type: markType,
      location: location || undefined,
      notes: notes || undefined,
    });
  };

  // Calcular tiempo trabajado entre marcaciones
  const calculatePeriodTime = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffMinutes = Math.floor((end - start) / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return { hours, minutes, totalMinutes: diffMinutes };
  };

  // Agrupar registros en períodos (entrada-salida)
  // Lógica simplificada: TODOS los períodos entrada-salida cuentan como trabajo
  const getPeriods = () => {
    const periods = [];
    let currentCheckIn = null;

    records.forEach((record, index) => {
      if (record.type === 'check_in') {
        // Si hay un período abierto, cerrarlo primero sumando tiempo hasta esta nueva entrada
        if (currentCheckIn) {
          const time = calculatePeriodTime(currentCheckIn.timestamp, record.timestamp);
          periods.push({
            id: `period-${index}-incomplete`,
            checkIn: currentCheckIn,
            checkOut: null,
            time,
            isWorkingPeriod: true,
          });
        }
        // Iniciar nuevo período (nueva entrada)
        currentCheckIn = record;
      } else if (record.type === 'check_out' && currentCheckIn) {
        // Cerrar período sumando tiempo
        const time = calculatePeriodTime(currentCheckIn.timestamp, record.timestamp);
        periods.push({
          id: `period-${index}`,
          checkIn: currentCheckIn,
          checkOut: record,
          time,
          isWorkingPeriod: true, // Todos los períodos cuentan
        });
        currentCheckIn = null;
      }
    });

    // Si hay una entrada sin salida (período abierto)
    if (currentCheckIn) {
      periods.push({
        id: `period-open-${records.length}`,
        checkIn: currentCheckIn,
        checkOut: null,
        time: null,
        isWorkingPeriod: true,
      });
    }

    return periods;
  };

  const periods = getPeriods();
  const totalMinutes = todayAttendance?.total_minutes || 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Asistencias</h1>
          <p className="mt-1 text-sm text-gray-500">
            Registra tus marcaciones de entrada y salida durante el día
          </p>
        </div>

        {/* Today's Attendance Card */}
        <Card>
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-4"
              >
                <ClockIcon className="h-20 w-20 text-indigo-600" />
              </motion.div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {formatDate(new Date(), 'long')}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('es-PE', { weekday: 'long' })}
              </p>
            </motion.div>

            {/* Resumen de tiempo trabajado */}
            {totalMinutes > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-indigo-50 rounded-lg"
              >
                <p className="text-sm text-gray-600 mb-1">Tiempo total trabajado</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {totalHours}h {totalMins}m
                </p>
              </motion.div>
            )}

            {/* Botones de marcación - Permite elegir entre Entrada o Salida */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => handleOpenMarkModal('check_in')}
                  disabled={markMutation.isPending}
                  loading={markMutation.isPending && markType === 'check_in'}
                  variant="success"
                  size="lg"
                  className="min-w-[200px] text-lg py-4"
                >
                  <CheckCircleIcon className="h-6 w-6 mr-2 inline" />
                  Marcar Entrada
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => handleOpenMarkModal('check_out')}
                  disabled={markMutation.isPending}
                  loading={markMutation.isPending && markType === 'check_out'}
                  variant="danger"
                  size="lg"
                  className="min-w-[200px] text-lg py-4"
                >
                  <XCircleIcon className="h-6 w-6 mr-2 inline" />
                  Marcar Salida
                </Button>
              </motion.div>
            </div>

            {nextMarkType && (
              <p className="mt-4 text-sm text-gray-500 text-center">
                Sugerencia: La próxima marcación sugerida es <span className="font-semibold">{nextMarkType === 'check_in' ? 'Entrada' : 'Salida'}</span>
              </p>
            )}
          </div>
        </Card>

        {/* Registros del día */}
        {records.length > 0 && (
          <Card title="Marcaciones de hoy">
            <div className="space-y-4">
              <AnimatePresence>
                {periods.map((period, index) => (
                  <motion.div
                    key={period.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Entrada */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <CheckCircleIcon className="h-6 w-6 text-green-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">Entrada</p>
                            <p className="text-sm text-gray-600">
                              {new Date(period.checkIn.timestamp).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </p>
                            {period.checkIn.location && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <MapPinIcon className="h-3 w-3" />
                                {period.checkIn.location}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Salida */}
                        {period.checkOut ? (
                          <>
                            <div className="flex items-center gap-3 ml-5 mb-2">
                              <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <XCircleIcon className="h-6 w-6 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">Salida</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(period.checkOut.timestamp).toLocaleTimeString('es-PE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </p>
                                {period.checkOut.location && (
                                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                    <MapPinIcon className="h-3 w-3" />
                                    {period.checkOut.location}
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="ml-5 mt-2">
                            <Badge variant="warning">En curso</Badge>
                          </div>
                        )}

                        {/* Tiempo del período */}
                        {period.time && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Tiempo trabajado</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {period.time.hours}h {period.time.minutes}m
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {records.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay marcaciones registradas hoy
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Historial */}
        <Card title="Historial de Asistencias">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {loadingHistory ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            </div>
          ) : attendanceHistory && attendanceHistory.length > 0 ? (
            <div className="space-y-3">
              {attendanceHistory.map((attendance) => {
                const attendanceRecords = attendance.records || [];
                return (
                  <div
                    key={attendance.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-gray-900">
                        {formatDate(attendance.date)}
                      </p>
                      <Badge
                        variant={
                          attendance.status === 'completed' ? 'success' :
                          attendance.status === 'late' ? 'warning' :
                          attendance.status === 'absent' ? 'danger' : 'secondary'
                        }
                      >
                        {attendance.status === 'completed' ? 'Completo' :
                         attendance.status === 'late' ? 'Tardanza' :
                         attendance.status === 'absent' ? 'Ausente' : 'Pendiente'}
                      </Badge>
                    </div>
                    {attendanceRecords.length > 0 && (
                      <div className="space-y-2">
                        {attendanceRecords.map((record, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {record.type === 'check_in' ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircleIcon className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="text-gray-600">
                              {getTypeLabel(record.type)}:{' '}
                              {new Date(record.timestamp).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {attendance.total_minutes > 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        Total: {Math.floor(attendance.total_minutes / 60)}h {attendance.total_minutes % 60}m
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No hay registros para esta fecha
            </div>
          )}
        </Card>
      </div>

      {/* Modal para marcar asistencia */}
      <Modal
        open={showMarkModal}
        onClose={() => {
          setShowMarkModal(false);
          setLocation('');
          setNotes('');
          setMarkType(null);
        }}
        title={`Marcar ${markType === 'check_in' ? 'Entrada' : 'Salida'}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowMarkModal(false);
                setLocation('');
                setNotes('');
                setMarkType(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMark}
              loading={markMutation.isPending}
              disabled={markMutation.isPending}
              variant={markType === 'check_in' ? 'success' : 'danger'}
            >
              Confirmar {markType === 'check_in' ? 'Entrada' : 'Salida'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Hora actual</p>
            <p className="text-2xl font-bold text-gray-900">
              {new Date().toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ubicación
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Obteniendo ubicación..."
              disabled
            />
            <p className="mt-1 text-xs text-gray-500">
              La ubicación se obtiene automáticamente si permites el acceso
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas sobre esta marcación..."
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
