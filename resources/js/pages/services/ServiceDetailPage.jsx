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
  BuildingOfficeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function ServiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Obtener servicio
  const { data: serviceData, isLoading: loadingService, error: serviceError, refetch } = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/services/${id}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching service:', error);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const service = serviceData;

  // Verificar permisos
  const canEdit = service && isSuperAdmin();
  const canDelete = service && isSuperAdmin();

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/services/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
      toast.success('Servicio eliminado correctamente');
      navigate('/services');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar servicio');
    },
  });

  // Loading state
  if (loadingService) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (serviceError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {serviceError.response?.data?.message || 'Error al cargar el servicio'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/services')}>
            Volver a Servicios
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No service found
  if (!service) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Servicio no encontrado
          </Alert>
          <Button variant="outline" onClick={() => navigate('/services')}>
            Volver a Servicios
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
              onClick={() => navigate('/services')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {service.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {service.code && `Código: ${service.code}`} {service.category && `• ${service.category}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(service.status)}>
              {getStatusLabel(service.status)}
            </Badge>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/services/${id}/edit`)}
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
          </div>
        </div>


        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Información del Servicio">
              <div className="space-y-4">
                {service.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descripción
                    </label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{service.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {service.category && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Categoría
                      </label>
                      <p className="text-sm text-gray-900">{service.category}</p>
                    </div>
                  )}
                  {service.price !== null && service.price !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Precio Unitario
                      </label>
                      <p className="text-sm text-gray-900">{formatCurrency(service.price)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Tipo de Facturación
                    </label>
                    <p className="text-sm text-gray-900">
                      {service.billing_type === 'monthly' ? 'Mensual' :
                       service.billing_type === 'annual' ? 'Anual' :
                       service.billing_type === 'project' ? 'Por Proyecto' : 'Por Hora'}
                    </p>
                  </div>
                  {service.standard_duration && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Duración Estándar
                      </label>
                      <p className="text-sm text-gray-900">{service.standard_duration} días</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Información del Servicio">
              <div className="space-y-3 text-sm">
                {service.code && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Código:</span>
                    <span className="text-gray-900">{service.code}</span>
                  </div>
                )}
                {service.category && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categoría:</span>
                    <span className="text-gray-900">{service.category}</span>
                  </div>
                )}
                {service.price !== null && service.price !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Precio:</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(service.price)}</span>
                  </div>
                )}
                {service.standard_duration && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duración:</span>
                    <span className="text-gray-900">{service.standard_duration} días</span>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Información Adicional">
              <div className="space-y-2 text-sm">
                {service.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creado:</span>
                    <span className="text-gray-900">
                      {formatDate(service.created_at)}
                    </span>
                  </div>
                )}
                {service.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Actualizado:</span>
                    <span className="text-gray-900">
                      {formatDate(service.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Delete Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Eliminar Servicio"
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
              ¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.
            </Alert>
            <p className="text-sm text-gray-600">
              El servicio <strong>{service.name}</strong> será eliminado permanentemente.
            </p>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

