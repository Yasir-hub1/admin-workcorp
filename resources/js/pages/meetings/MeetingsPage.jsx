import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, CalendarIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function MeetingsPage() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    my_meetings: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', page, filters],
    queryFn: async () => {
      const params = {
        page,
        per_page: 15,
      };

      // Solo agregar filtros si tienen valor
      if (filters.status) {
        params.status = filters.status;
      }

      // Solo agregar my_meetings si está activado
      if (filters.my_meetings) {
        params.my_meetings = true;
      }

      const response = await apiClient.get('/meetings', { params });
      return response.data;
    },
  });

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPage(1);
  }, [filters.status, filters.my_meetings]);

  // Obtener usuarios para el selector de asistentes
  const { data: usersData } = useQuery({
    queryKey: ['users-for-meetings'],
    queryFn: async () => {
      // Obtener usuarios a través de las áreas
      const users = [];
      try {
        const areasResponse = await apiClient.get('/areas');
        const areas = areasResponse.data.data || [];

        // Obtener usuarios de cada área
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

      // Eliminar duplicados
      const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );

      return uniqueUsers;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/meetings', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meetings']);
      resetForm();
      toast.success('Reunión creada correctamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear reunión');
    },
  });

  const columns = [
    {
      key: 'title',
      header: 'Reunión',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.organizer?.name}</div>
        </div>
      ),
    },
    {
      key: 'start_time',
      header: 'Fecha y Hora',
      render: (value, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatDate(value, 'datetime')}
          </div>
          <div className="text-xs text-gray-500">
            Duración: {Math.round((new Date(row.end_time) - new Date(value)) / 60000)} min
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Ubicación',
      render: (value) => (
        <span className="text-sm text-gray-900">{value || 'Virtual'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (value) => (
        <Badge
          variant={
            value === 'completed' ? 'success' :
            value === 'in_progress' ? 'info' :
            value === 'cancelled' ? 'danger' : 'secondary'
          }
        >
          {value === 'scheduled' ? 'Programada' :
           value === 'in_progress' ? 'En Curso' :
           value === 'completed' ? 'Completada' :
           value === 'cancelled' ? 'Cancelada' : value}
        </Badge>
      ),
    },
    {
      key: 'attendees',
      header: 'Invitados',
      render: (value) => (
        <span className="text-sm text-gray-900">
          {Array.isArray(value) ? value.length : 0} personas
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Link
          to={`/meetings/${row.id}`}
          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
        >
          Ver detalles
        </Link>
      ),
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createMutation.mutate({
      title: formData.get('title'),
      description: formData.get('description'),
      start_time: formData.get('start_time'),
      end_time: formData.get('end_time'),
      location: formData.get('location'),
      meeting_type: formData.get('meeting_type'),
      attendees: selectedAttendees.map(a => a.id),
      agenda: formData.get('agenda'),
    });
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

  const resetForm = () => {
    setSelectedAttendees([]);
    setShowCreateModal(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reuniones</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona las reuniones y eventos de la empresa
            </p>
          </div>
          <Button icon={PlusIcon} onClick={() => setShowCreateModal(true)}>
            Nueva Reunión
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <select
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Todos los estados</option>
                <option value="scheduled">Programada</option>
                <option value="in_progress">En Curso</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="my_meetings"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={filters.my_meetings}
                onChange={(e) => setFilters({ ...filters, my_meetings: e.target.checked })}
              />
              <label htmlFor="my_meetings" className="ml-2 block text-sm text-gray-900">
                Solo mis reuniones
              </label>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card padding={false}>
          {!isLoading && data?.data?.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title="No hay reuniones"
              description="Comienza creando tu primera reunión"
              action={
                <Button icon={PlusIcon} onClick={() => setShowCreateModal(true)}>
                  Nueva Reunión
                </Button>
              }
            />
          ) : (
            <>
              <Table
                columns={columns}
                data={data?.data || []}
                loading={isLoading}
              />
              {data?.meta && data.meta.total > data.meta.per_page && (
                <Pagination
                  currentPage={data.meta.current_page}
                  totalPages={data.meta.last_page}
                  perPage={data.meta.per_page}
                  totalItems={data.meta.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </Card>

        {/* Create Modal */}
        <Modal
          open={showCreateModal}
          onClose={resetForm}
          title="Nueva Reunión"
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="meeting-form"
                loading={createMutation.isPending}
              >
                Crear Reunión
              </Button>
            </>
          }
        >
          <form id="meeting-form" onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Título"
              name="title"
              required
              placeholder="Ej: Reunión de equipo"
            />
            <Textarea
              label="Descripción"
              name="description"
              rows={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha y Hora Inicio"
                name="start_time"
                type="datetime-local"
                required
              />
              <Input
                label="Fecha y Hora Fin"
                name="end_time"
                type="datetime-local"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Ubicación"
                name="location"
                placeholder="Ej: Sala de juntas A"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  name="meeting_type"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="internal">Interna</option>
                  <option value="external">Externa</option>
                  <option value="client">Con Cliente</option>
                </select>
              </div>
            </div>
            <Textarea
              label="Agenda"
              name="agenda"
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
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}

