import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
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
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function ExpenseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');
  const [paymentData, setPaymentData] = useState({
    payment_method: '',
    payment_date: '',
    payment_operation_number: '',
  });

  // Obtener gasto
  const { data: expenseData, isLoading: loadingExpense, error: expenseError, refetch } = useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/expenses/${id}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching expense:', error);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const expense = expenseData;

  // Verificar permisos
  const canEdit = expense && expense.status === 'pending' && (
    isSuperAdmin() || expense.created_by?.id === user?.id
  );
  const canDelete = expense && expense.status === 'pending' && (
    isSuperAdmin() || expense.created_by?.id === user?.id
  );
  const canApprove = expense && expense.status === 'pending' && isSuperAdmin();
  const canMarkAsPaid = expense && expense.status === 'approved' && isSuperAdmin();

  // Mapear estados del backend al frontend
  const getMappedStatus = (status) => {
    const statusMap = {
      'pending': 'pendiente',
      'approved': 'aprobado',
      'rejected': 'rechazado',
      'paid': 'pagado',
    };
    return statusMap[status] || status;
  };

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/expenses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Gasto eliminado correctamente');
      navigate('/expenses');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar gasto');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/expenses/${id}/approve`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['expense', id]);
      toast.success('Gasto aprobado correctamente');
      setShowApproveModal(false);
      setApprovalComments('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al aprobar gasto');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/expenses/${id}/approve`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['expense', id]);
      toast.success('Gasto rechazado correctamente');
      setShowRejectModal(false);
      setRejectionComments('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al rechazar gasto');
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/expenses/${id}/mark-as-paid`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['expense', id]);
      toast.success('Gasto marcado como pagado correctamente');
      setShowPaidModal(false);
      setPaymentData({ payment_method: '', payment_date: '', payment_operation_number: '' });
      refetch();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al marcar como pagado');
    },
  });

  // Loading state
  if (loadingExpense) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (expenseError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {expenseError.response?.data?.message || 'Error al cargar el gasto'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/expenses')}>
            Volver a Gastos
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No expense found
  if (!expense) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Gasto no encontrado
          </Alert>
          <Button variant="outline" onClick={() => navigate('/expenses')}>
            Volver a Gastos
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
              onClick={() => navigate('/expenses')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Gasto #{expense.id}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {expense.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(getMappedStatus(expense.status))}>
              {getStatusLabel(getMappedStatus(expense.status))}
            </Badge>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/expenses/${id}/edit`)}
                icon={PencilIcon}
              >
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                icon={TrashIcon}
              >
                Eliminar
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  variant="success"
                  onClick={() => setShowApproveModal(true)}
                  icon={CheckCircleIcon}
                >
                  Aprobar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowRejectModal(true)}
                  icon={XCircleIcon}
                >
                  Rechazar
                </Button>
              </>
            )}
            {canMarkAsPaid && (
              <Button
                variant="success"
                onClick={() => setShowPaidModal(true)}
                icon={CurrencyDollarIcon}
              >
                Marcar como Pagado
              </Button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Información del Gasto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Descripción
                  </label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">
                    {expense.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Monto
                    </label>
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Fecha del Gasto
                    </label>
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-900">
                        {formatDate(expense.expense_date)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Categoría
                    </label>
                    <p className="text-sm text-gray-900">{expense.category}</p>
                  </div>
                  {expense.subcategory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Subcategoría
                      </label>
                      <p className="text-sm text-gray-900">{expense.subcategory}</p>
                    </div>
                  )}
                  {expense.area && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Área
                      </label>
                      <p className="text-sm text-gray-900">{expense.area.name}</p>
                    </div>
                  )}
                  {expense.cost_center && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Centro de Costos
                      </label>
                      <p className="text-sm text-gray-900">{expense.cost_center}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {expense.supplier_name && (
              <Card title="Información del Proveedor">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {expense.supplier_ruc_dni && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          NIT/CI
                        </label>
                        <p className="text-sm text-gray-900">{expense.supplier_ruc_dni}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Nombre
                      </label>
                      <p className="text-sm text-gray-900">{expense.supplier_name}</p>
                    </div>
                    {expense.document_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Número de Documento
                        </label>
                        <p className="text-sm text-gray-900">{expense.document_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {expense.status === 'paid' && expense.payment_date && (
              <Card title="Información de Pago">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Método de Pago
                      </label>
                      <p className="text-sm text-gray-900">{expense.payment_method || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Fecha de Pago
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDate(expense.payment_date)}
                      </p>
                    </div>
                    {expense.payment_operation_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Número de Operación
                        </label>
                        <p className="text-sm text-gray-900">{expense.payment_operation_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Estado">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado:</span>
                  <Badge className={getStatusColor(getMappedStatus(expense.status))}>
                    {getStatusLabel(getMappedStatus(expense.status))}
                  </Badge>
                </div>
                {expense.requested_by && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Solicitante:</span>
                    <span className="text-gray-900">{expense.requested_by.name}</span>
                  </div>
                )}
                {expense.paid_by && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pagado por:</span>
                    <span className="text-gray-900">{expense.paid_by.name}</span>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Información Adicional">
              <div className="space-y-2 text-sm">
                {expense.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creado:</span>
                    <span className="text-gray-900">
                      {formatDate(expense.created_at)}
                    </span>
                  </div>
                )}
                {expense.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Actualizado:</span>
                    <span className="text-gray-900">
                      {formatDate(expense.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Eliminar Gasto"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  deleteMutation.mutate();
                  setShowDeleteModal(false);
                }}
                loading={deleteMutation.isPending}
                icon={TrashIcon}
              >
                Eliminar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Alert variant="warning">
              ¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer.
            </Alert>
            <p className="text-sm text-gray-600">
              El gasto <strong>{expense.description}</strong> será eliminado permanentemente.
            </p>
          </div>
        </Modal>

        <Modal
          open={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Aprobar Gasto"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setShowApproveModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  approveMutation.mutate({
                    status: 'approved',
                    comments: approvalComments,
                  });
                }}
                loading={approveMutation.isPending}
                icon={CheckCircleIcon}
              >
                Aprobar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Textarea
              label="Comentarios (opcional)"
              value={approvalComments}
              onChange={(e) => setApprovalComments(e.target.value)}
              rows={3}
              placeholder="Agregar comentarios sobre la aprobación..."
            />
          </div>
        </Modal>

        <Modal
          open={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Rechazar Gasto"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  rejectMutation.mutate({
                    status: 'rejected',
                    comments: rejectionComments,
                  });
                }}
                loading={rejectMutation.isPending}
                icon={XCircleIcon}
              >
                Rechazar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Textarea
              label="Razón del rechazo *"
              value={rejectionComments}
              onChange={(e) => setRejectionComments(e.target.value)}
              rows={3}
              placeholder="Explicar por qué se rechaza el gasto..."
              required
            />
          </div>
        </Modal>

        <Modal
          open={showPaidModal}
          onClose={() => setShowPaidModal(false)}
          title="Marcar como Pagado"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setShowPaidModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={() => {
                  markAsPaidMutation.mutate(paymentData);
                }}
                loading={markAsPaidMutation.isPending}
                icon={CurrencyDollarIcon}
              >
                Marcar como Pagado
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Método de Pago *"
              value={paymentData.payment_method}
              onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
              required
              options={[
                { value: '', label: 'Seleccionar método' },
                { value: 'cash', label: 'Efectivo' },
                { value: 'transfer', label: 'Transferencia' },
                { value: 'card', label: 'Tarjeta' },
                { value: 'check', label: 'Cheque' },
              ]}
            />
            <Input
              label="Fecha de Pago *"
              type="date"
              value={paymentData.payment_date}
              onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
              required
            />
            <Input
              label="Número de Operación"
              value={paymentData.payment_operation_number}
              onChange={(e) => setPaymentData({ ...paymentData, payment_operation_number: e.target.value })}
              placeholder="Número de operación bancaria"
            />
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

