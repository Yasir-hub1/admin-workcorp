import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
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
import { formatDate, formatDateTime, calculateDaysBetween } from '../../utils/formatters';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function RequestDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Obtener solicitud
  const { data: requestData, isLoading: loadingRequest, error: requestError, refetch } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => {
      try {
        console.log('Fetching request with id:', id);
        const response = await apiClient.get(`/requests/${id}`);
        console.log('Request response:', response.data);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching request:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const request = requestData;

  // Debug logs
  console.log('RequestDetailPage - id:', id);
  console.log('RequestDetailPage - isAuthenticated:', isAuthenticated);
  console.log('RequestDetailPage - user:', user);
  console.log('RequestDetailPage - loadingRequest:', loadingRequest);
  console.log('RequestDetailPage - requestError:', requestError);
  console.log('RequestDetailPage - request:', request);

  // Verificar permisos
  const canEdit = request && (
    isSuperAdmin() ||
    (hasPermission('requests.edit') && request.user_id === user?.id && request.status === 'pending')
  );

  const canApprove = request && request.status === 'pending' && (
    isSuperAdmin() || hasPermission('requests.approve')
  );

  const canReject = request && request.status === 'pending' && (
    isSuperAdmin() || hasPermission('requests.reject')
  );

  const canCancel = request && request.status === 'pending' && request.user_id === user?.id;

  // Mutation para aprobar
  const approveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/requests/${id}/approve`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      queryClient.invalidateQueries(['request', id]);
      toast.success('Solicitud aprobada correctamente');
      setShowApproveModal(false);
      setApprovalNotes('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al aprobar solicitud');
    },
  });

  // Mutation para rechazar
  const rejectMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/requests/${id}/reject`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      queryClient.invalidateQueries(['request', id]);
      toast.success('Solicitud rechazada');
      setShowRejectModal(false);
      setRejectionReason('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al rechazar solicitud');
    },
  });

  // Mutation para cancelar
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(`/requests/${id}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['requests']);
      queryClient.invalidateQueries(['request', id]);
      toast.success('Solicitud cancelada');
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al cancelar solicitud');
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      approval_notes: approvalNotes || null,
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      toast.error('Debes proporcionar una razón para rechazar');
      return;
    }
    rejectMutation.mutate({
      rejection_reason: rejectionReason,
    });
  };

  const getTypeLabel = (type) => {
    const types = {
      permission: 'Permiso',
      vacation: 'Vacaciones',
      license: 'Licencia',
      schedule_change: 'Cambio de Horario',
      advance: 'Adelanto',
    };
    return types[type] || type;
  };

  if (loadingRequest) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </AppLayout>
    );
  }

  if (requestError || !request) {
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
                Solicitud no encontrada
              </h1>
            </div>
          </div>
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {requestError?.response?.data?.message || 'La solicitud no existe o no tienes permisos para verla'}
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
                {request.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {getTypeLabel(request.type)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(request.status)}>
              {getStatusLabel(request.status)}
            </Badge>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/requests/${id}/edit`)}
                icon={PencilIcon}
              >
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Actions */}
        {request.status === 'pending' && (
          <Card>
            <div className="flex flex-wrap gap-3">
              {canApprove && (
                <Button
                  variant="success"
                  onClick={() => setShowApproveModal(true)}
                  icon={CheckCircleIcon}
                >
                  Aprobar Solicitud
                </Button>
              )}
              {canReject && (
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  icon={XCircleIcon}
                >
                  Rechazar Solicitud
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (window.confirm('¿Estás seguro de cancelar esta solicitud?')) {
                      cancelMutation.mutate();
                    }
                  }}
                  loading={cancelMutation.isPending}
                >
                  Cancelar Solicitud
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Información de la Solicitud">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Descripción
                  </label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {request.description || 'Sin descripción'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Fecha de Inicio
                    </label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {request.start_date ? formatDate(request.start_date) : '-'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Fecha de Fin
                    </label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {request.end_date ? formatDate(request.end_date) : '-'}
                      </p>
                    </div>
                  </div>

                  {request.start_time && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Hora de Inicio
                      </label>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{request.start_time}</p>
                      </div>
                    </div>
                  )}

                  {request.end_time && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Hora de Fin
                      </label>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">{request.end_time}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Días Solicitados
                    </label>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        let days = request.days_requested;
                        // Si no hay días pero hay fechas, calcular
                        if (!days && request.start_date) {
                          days = calculateDaysBetween(request.start_date, request.end_date);
                        }
                        if (!days) return '-';
                        return `${days} ${days === 1 ? 'día' : 'días'}`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Información del Solicitante">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {request.user?.name || '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {request.user?.email || '-'}
                    </p>
                  </div>
                </div>
                {request.area && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Área
                    </label>
                    <p className="text-sm text-gray-900">{request.area.name}</p>
                  </div>
                )}
              </div>
            </Card>

            {request.status !== 'pending' && (
              <Card title="Información de Aprobación">
                <div className="space-y-3">
                  {request.approved_by_user && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Aprobado por
                      </label>
                      <p className="text-sm text-gray-900">
                        {request.approved_by_user.name}
                      </p>
                    </div>
                  )}
                  {request.approved_at && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Fecha de Aprobación
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(request.approved_at)}
                      </p>
                    </div>
                  )}
                  {request.approval_notes && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Notas de Aprobación
                      </label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {request.approval_notes}
                      </p>
                    </div>
                  )}
                  {request.rejection_reason && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Razón de Rechazo
                      </label>
                      <p className="text-sm text-red-600 whitespace-pre-wrap">
                        {request.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card title="Información del Sistema">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Creado:</span>
                  <span className="text-gray-900">
                    {formatDateTime(request.created_at)}
                  </span>
                </div>
                {request.updated_at !== request.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Actualizado:</span>
                    <span className="text-gray-900">
                      {formatDateTime(request.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        open={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setApprovalNotes('');
        }}
        title="Aprobar Solicitud"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveModal(false);
                setApprovalNotes('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={handleApprove}
              loading={approveMutation.isPending}
              icon={CheckCircleIcon}
            >
              Aprobar Solicitud
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de aprobar esta solicitud?
          </p>
          <Textarea
            label="Notas de Aprobación (Opcional)"
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            rows={3}
            placeholder="Agrega notas adicionales sobre la aprobación..."
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={showRejectModal}
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
        }}
        title="Rechazar Solicitud"
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              loading={rejectMutation.isPending}
              icon={XCircleIcon}
            >
              Rechazar Solicitud
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de rechazar esta solicitud? Por favor, proporciona una razón.
          </p>
          <Textarea
            label="Razón de Rechazo"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            required
            placeholder="Explica por qué se rechaza esta solicitud..."
          />
        </div>
      </Modal>
    </AppLayout>
  );
}

