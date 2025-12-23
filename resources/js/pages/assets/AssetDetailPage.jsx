import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  UserIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
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
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function AssetDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Obtener activo
  const { data: assetData, isLoading: loadingAsset, error: assetError, refetch } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      try {
        console.log('Fetching asset with id:', id);
        const response = await apiClient.get(`/assets/${id}`);
        console.log('Asset response:', response.data);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching asset:', error);
        console.error('Error response:', error.response?.data);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const asset = assetData;

  // Obtener mantenimientos
  const { data: maintenancesData } = useQuery({
    queryKey: ['asset-maintenances', id],
    queryFn: async () => {
      const response = await apiClient.get(`/assets/${id}/maintenances`);
      return response.data.data || [];
    },
    enabled: !!id && isAuthenticated && !!user,
  });

  // Verificar permisos
  const canEdit = asset && isSuperAdmin();
  const canDelete = asset && isSuperAdmin();

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/assets/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      toast.success('Activo eliminado correctamente');
      navigate('/assets');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar activo');
    },
  });

  const getStatusLabel = (status) => {
    const labels = {
      available: 'Disponible',
      in_use: 'En Uso',
      maintenance: 'En Mantenimiento',
      repair: 'En Reparación',
      decommissioned: 'Dado de Baja',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      in_use: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      repair: 'bg-orange-100 text-orange-800',
      decommissioned: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Loading state
  if (loadingAsset) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (assetError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {assetError.response?.data?.message || 'Error al cargar el activo'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/assets')}>
            Volver a Activos
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No asset found
  if (!asset) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Activo no encontrado
          </Alert>
          <Button variant="outline" onClick={() => navigate('/assets')}>
            Volver a Activos
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
              onClick={() => navigate('/assets')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {asset.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {asset.code || 'Sin código'} • {asset.category}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(asset.status)}>
              {getStatusLabel(asset.status)}
            </Badge>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/assets/${id}/edit`)}
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

        {/* Details */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Información del Activo">
              <div className="space-y-4">
                {asset.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descripción
                    </label>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {asset.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Número de Serie
                    </label>
                    <p className="text-sm text-gray-900">{asset.serial_number || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Marca
                    </label>
                    <p className="text-sm text-gray-900">{asset.brand || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Modelo
                    </label>
                    <p className="text-sm text-gray-900">{asset.model || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Categoría
                    </label>
                    <p className="text-sm text-gray-900">{asset.category}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Información Financiera">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Costo de Adquisición
                    </label>
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(asset.acquisition_cost)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Valor Actual
                    </label>
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(asset.current_value)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Depreciación
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatCurrency(asset.depreciation || 0)}
                    </p>
                  </div>
                  {asset.purchase_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Fecha de Compra
                      </label>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">
                          {formatDate(asset.purchase_date)}
                        </p>
                      </div>
                    </div>
                  )}
                  {asset.supplier && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Proveedor
                      </label>
                      <p className="text-sm text-gray-900">{asset.supplier}</p>
                    </div>
                  )}
                  {asset.invoice_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Número de Factura
                      </label>
                      <p className="text-sm text-gray-900">{asset.invoice_number}</p>
                    </div>
                  )}
                  {asset.payment_method && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Método de Pago
                      </label>
                      <p className="text-sm text-gray-900">{asset.payment_method}</p>
                    </div>
                  )}
                  {asset.useful_life_years && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Vida Útil
                      </label>
                      <p className="text-sm text-gray-900">{asset.useful_life_years} años</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {asset.warranty_start_date && (
              <Card title="Información de Garantía">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Fecha de Inicio
                      </label>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-900">
                          {formatDate(asset.warranty_start_date)}
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
                          {formatDate(asset.warranty_end_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {asset.warranty_terms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Términos
                      </label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {asset.warranty_terms}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {maintenancesData && maintenancesData.length > 0 && (
              <Card title="Historial de Mantenimientos">
                <div className="space-y-3">
                  {maintenancesData.map((maintenance) => (
                    <div key={maintenance.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {maintenance.type === 'preventive' ? 'Preventivo' : 'Correctivo'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {maintenance.performed_by?.name || 'N/A'} • {formatDate(maintenance.completed_date || maintenance.scheduled_date)}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatCurrency(maintenance.cost)}
                        </Badge>
                      </div>
                      {maintenance.notes && (
                        <p className="text-xs text-gray-600 mt-1">{maintenance.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Estado y Ubicación">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Estado:</span>
                  <Badge className={getStatusColor(asset.status)}>
                    {getStatusLabel(asset.status)}
                  </Badge>
                </div>
                {asset.area && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Área:</span>
                    <span className="text-gray-900">{asset.area.name}</span>
                  </div>
                )}
                {asset.location && (
                  <div className="flex items-start justify-between">
                    <span className="text-gray-500">Ubicación:</span>
                    <div className="flex items-center gap-1 text-right">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{asset.location}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {asset.assigned_user && (
              <Card title="Asignado a">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-indigo-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {asset.assigned_user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {asset.assigned_user.email}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card title="Información Adicional">
              <div className="space-y-2 text-sm">
                {asset.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Creado:</span>
                    <span className="text-gray-900">
                      {formatDate(asset.created_at)}
                    </span>
                  </div>
                )}
                {asset.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Actualizado:</span>
                    <span className="text-gray-900">
                      {formatDate(asset.updated_at)}
                    </span>
                  </div>
                )}
                {asset.maintenances_count !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mantenimientos:</span>
                    <span className="text-gray-900">{asset.maintenances_count}</span>
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
          title="Eliminar Activo"
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
              ¿Estás seguro de eliminar este activo? Esta acción no se puede deshacer.
            </Alert>
            <p className="text-sm text-gray-600">
              El activo <strong>{asset.name}</strong> será eliminado permanentemente.
            </p>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

