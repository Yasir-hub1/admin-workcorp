import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  TagIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import Textarea from '../../components/common/Textarea';
import { formatDate, formatDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../../utils/notificationSound';
import useAuthStore from '../../store/authStore';
import Select from '../../components/common/Select';

export default function TicketDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  // Obtener ticket
  const { data: ticketData, isLoading: loadingTicket, error: ticketError, refetch } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      try {
        console.log('Fetching ticket with id:', id);
        const response = await apiClient.get(`/tickets/${id}`);
        console.log('Ticket response:', response.data);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching ticket:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const ticket = ticketData;

  // Verificar permisos
  const canEdit = ticket && (
    isSuperAdmin() ||
    ticket.created_by_id === user?.id ||
    ticket.created_by?.id === user?.id ||
    ticket.assigned_to_id === user?.id ||
    ticket.assigned_to?.id === user?.id
  );

  const canResolve = ticket && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
    isSuperAdmin() ||
    ticket.assigned_to_id === user?.id ||
    ticket.assigned_to?.id === user?.id
  );

  const canAssign = ticket && ['open', 'assigned'].includes(ticket.status) && (
    isSuperAdmin() || 
    (ticket.area_id && user?.area_id === ticket.area_id)
  );

  // Mutation para resolver
  const resolveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/tickets/${id}/resolve`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['ticket', id]);
      toast.success('Ticket resuelto correctamente');
      setShowResolveModal(false);
      setResolutionNotes('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al resolver ticket');
    },
  });

  // Obtener usuarios para asignación
  const { data: usersData } = useQuery({
    queryKey: ['users-for-tickets'],
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

  // Mutation para asignar
  const assignMutation = useMutation({
    mutationFn: async (assignedToId) => {
      const response = await apiClient.post(`/tickets/${id}/assign`, { assigned_to: assignedToId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['ticket', id]);
      toast.success('Ticket asignado correctamente');
      setShowAssignModal(false);
      setAssignedTo('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al asignar ticket');
    },
  });

  const resendPushMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/tickets/${id}/resend-push`);
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

  const getStatusLabel = (status) => {
    const labels = {
      open: 'Abierto',
      assigned: 'Asignado',
      in_progress: 'En Progreso',
      resolved: 'Resuelto',
      closed: 'Cerrado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-indigo-100 text-indigo-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      it: 'TI',
      maintenance: 'Mantenimiento',
      hr: 'RRHH',
      finance: 'Finanzas',
      other: 'Otro',
    };
    return labels[category] || category;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      urgent: 'Urgente',
      high: 'Alta',
      medium: 'Media',
      low: 'Baja',
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const isSlaOverdue = ticket && ticket.sla_due_at && new Date(ticket.sla_due_at) < new Date() && ['open', 'assigned', 'in_progress'].includes(ticket.status);

  // Loading state
  if (loadingTicket) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (ticketError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {ticketError.response?.data?.message || 'Error al cargar el ticket'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/tickets')}>
            Volver a Tickets
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No ticket found
  if (!ticket) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Ticket no encontrado
          </Alert>
          <Button variant="outline" onClick={() => navigate('/tickets')}>
            Volver a Tickets
          </Button>
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
              onClick={() => navigate('/tickets')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {ticket.ticket_number}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {ticket.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(ticket.status)}>
              {getStatusLabel(ticket.status)}
            </Badge>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/tickets/${id}/edit`)}
                icon={PencilIcon}
              >
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* SLA Warning */}
        {isSlaOverdue && (
          <Alert variant="danger">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>Este ticket ha excedido el tiempo de SLA</span>
            </div>
          </Alert>
        )}

        {/* Actions */}
        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
          <Card>
            <div className="flex flex-wrap gap-3">
              {canAssign && (
                <Button
                  variant="info"
                  onClick={() => setShowAssignModal(true)}
                  icon={UserIcon}
                >
                  {ticket.assigned_to ? 'Reasignar Ticket' : 'Asignar Ticket'}
                </Button>
              )}
              {canAssign && ticket.assigned_to && (
                <Button
                  variant="secondary"
                  onClick={() => resendPushMutation.mutate()}
                  loading={resendPushMutation.isPending}
                  icon={BellAlertIcon}
                >
                  Reenviar Notificación Push
                </Button>
              )}
              {canResolve && (
                <Button
                  variant="success"
                  onClick={() => setShowResolveModal(true)}
                  icon={CheckCircleIcon}
                >
                  Resolver Ticket
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Descripción del Ticket">
              <div className="space-y-4">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {ticket.description || 'Sin descripción'}
                </p>

                {ticket.resolution_notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Notas de Resolución
                    </label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {ticket.resolution_notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Información del Ticket">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado:</span>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
                {ticket.client && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente:</span>
                    <span className="text-gray-900 text-right">
                      {ticket.client.business_name || ticket.client.legal_name || 'N/A'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Categoría:</span>
                  <Badge variant="secondary">
                    {getCategoryLabel(ticket.category)}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prioridad:</span>
                  <Badge className={getPriorityColor(ticket.priority)}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                </div>
                {ticket.sla_due_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">SLA vence:</span>
                    <span className={`text-gray-900 ${isSlaOverdue ? 'text-red-600 font-semibold' : ''}`}>
                      {formatDateTime(ticket.sla_due_at)}
                    </span>
                  </div>
                )}
                {ticket.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creado:</span>
                    <span className="text-gray-900">
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                )}
                {ticket.resolved_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Resuelto:</span>
                    <span className="text-gray-900">
                      {formatDate(ticket.resolved_at)}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Creado por">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ticket.created_by?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ticket.created_by?.email || ''}
                  </p>
                </div>
              </div>
            </Card>

            {ticket.assigned_to && (
              <Card title="Asignado a">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {ticket.assigned_to.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ticket.assigned_to.email || ''}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {ticket.resolved_by && (
              <Card title="Resuelto por">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {ticket.resolved_by.name || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {ticket.resolved_by.email || ''}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {ticket.area && (
              <Card title="Área">
                <p className="text-sm text-gray-900">{ticket.area.name}</p>
              </Card>
            )}
          </div>
        </div>

        {/* Assign Modal */}
        <Modal
          open={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setAssignedTo('');
          }}
          title={ticket.assigned_to ? 'Reasignar Ticket' : 'Asignar Ticket'}
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignedTo('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!assignedTo) {
                    toast.error('Por favor, selecciona un usuario');
                    return;
                  }
                  assignMutation.mutate(parseInt(assignedTo));
                }}
                loading={assignMutation.isPending}
                icon={UserIcon}
              >
                {ticket.assigned_to ? 'Reasignar' : 'Asignar'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Asignar a"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
              placeholder="Selecciona un usuario..."
              options={usersData?.map(user => ({
                value: user.id.toString(),
                label: `${user.name} (${user.email})`,
              })) || []}
            />
            {ticket.assigned_to && (
              <Alert variant="info">
                Este ticket ya está asignado a {ticket.assigned_to.name}. Al reasignarlo, el estado cambiará a "Asignado".
              </Alert>
            )}
          </div>
        </Modal>

        {/* Resolve Modal */}
        <Modal
          open={showResolveModal}
          onClose={() => {
            setShowResolveModal(false);
            setResolutionNotes('');
          }}
          title="Resolver Ticket"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResolveModal(false);
                  setResolutionNotes('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!resolutionNotes.trim()) {
                    toast.error('Por favor, ingresa las notas de resolución');
                    return;
                  }
                  resolveMutation.mutate({ resolution_notes: resolutionNotes });
                }}
                loading={resolveMutation.isPending}
                icon={CheckCircleIcon}
              >
                Resolver Ticket
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Textarea
              label="Notas de Resolución"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={5}
              required
              placeholder="Describe cómo se resolvió el ticket..."
            />
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

