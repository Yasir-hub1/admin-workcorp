import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BellIcon, CheckCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';
import AppLayout from '../layouts/AppLayout';
import apiClient from '../api/client';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import LocationViewModal from '../components/common/LocationViewModal';
import { formatDate } from '../utils/formatters';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    is_read: '',
    type: '',
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  // Función para parsear coordenadas desde el string de ubicación
  const parseLocation = (locationString) => {
    if (!locationString || locationString === 'No disponible' || locationString === 'No especificada') {
      return null;
    }

    // El formato es "lat, lng" o "lat,lng"
    const parts = locationString.split(',').map(part => part.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  // Función para abrir el mapa con las coordenadas
  const handleViewMap = (notification) => {
    const location = notification.data?.location || notification.location;
    const coordinates = parseLocation(location);

    if (coordinates) {
      setSelectedLocation({
        lat: coordinates.lat,
        lng: coordinates.lng,
        address: location,
      });
      setShowMapModal(true);
    } else {
      toast.error('No hay coordenadas disponibles para esta marcación');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const response = await apiClient.get('/notifications', {
        params: {
          is_read: filters.is_read || undefined,
          type: filters.type || undefined,
          per_page: 50,
        },
      });
      return response.data;
    },
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications/unread-count');
      return response.data.data.count;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.post(`/notifications/${notificationId}/mark-as-read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Notificación marcada como leída');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/mark-all-as-read');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Todas las notificaciones marcadas como leídas');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      toast.success('Notificación eliminada');
    },
  });

  const notifications = data?.data || [];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notificaciones</h1>
            <p className="mt-1 text-sm text-gray-500">
              {unreadCount > 0 && (
                <span className="text-indigo-600 font-medium">
                  Tienes {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
                </span>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              loading={markAllAsReadMutation.isPending}
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filters.is_read}
                onChange={(e) => setFilters({ ...filters, is_read: e.target.value })}
              >
                <option value="">Todas</option>
                <option value="false">No leídas</option>
                <option value="true">Leídas</option>
              </select>
            </div>
            <div>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Todos los tipos</option>
                <option value="attendance">Asistencias</option>
                <option value="request">Solicitudes</option>
                <option value="expense">Gastos</option>
                <option value="service">Servicios</option>
                <option value="asset">Activos</option>
                <option value="ticket">Tickets</option>
                <option value="meeting">Reuniones</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
            </div>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <EmptyState
              icon={BellIcon}
              title="No hay notificaciones"
              description="No tienes notificaciones en este momento"
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all ${
                  !notification.is_read ? 'bg-indigo-50 border-indigo-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-indigo-600" />
                      )}
                      <Badge
                        variant={
                          notification.priority === 'urgent' ? 'danger' :
                          notification.priority === 'high' ? 'warning' : 'secondary'
                        }
                        size="sm"
                      >
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{formatDate(notification.created_at, 'datetime')}</span>
                      <span className="capitalize">{notification.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        title="Marcar como leída"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(notification.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {notification.action_url && (
                  <div className="mt-3">
                    <a
                      href={notification.action_url}
                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Ver detalles →
                    </a>
                  </div>
                )}
                {/* Botón Ver Mapa para notificaciones de asistencia */}
                {notification.type === 'attendance' && notification.data?.location && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewMap(notification)}
                      icon={MapPinIcon}
                    >
                      Ver Mapa
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Mapa */}
      <LocationViewModal
        open={showMapModal}
        onClose={() => {
          setShowMapModal(false);
          setSelectedLocation(null);
        }}
        lat={selectedLocation?.lat}
        lng={selectedLocation?.lng}
        address={selectedLocation?.address}
      />
    </AppLayout>
  );
}

