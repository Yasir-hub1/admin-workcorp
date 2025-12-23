import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function PermissionDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Obtener permiso
  const { data: permissionData, isLoading: loadingPermission, error: permissionError } = useQuery({
    queryKey: ['permission', id],
    queryFn: async () => {
      const response = await apiClient.get(`/permissions/${id}`);
      return response.data.data;
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const permission = permissionData;

  // Verificar permisos
  const canEdit = permission && isSuperAdmin();
  const canDelete = permission && isSuperAdmin() && (permission.roles_count === 0);

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/permissions/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissions']);
      toast.success('Permiso eliminado correctamente');
      navigate('/permissions');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar permiso');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteModal(false);
  };

  // Loading state
  if (loadingPermission) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (permissionError || !permission) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert variant="error" title="Error">
            {permissionError?.response?.data?.message || 'Permiso no encontrado'}
          </Alert>
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
              onClick={() => navigate('/permissions')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {permission.display_name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {permission.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/permissions/${id}/edit`)}
                icon={PencilIcon}
              >
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                icon={TrashIcon}
                className="text-red-600 hover:text-red-700 hover:border-red-300"
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>

        {/* Información General */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información General</h2>
              <dl className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Nombre del Permiso
                  </label>
                  <p className="text-sm text-gray-900">{permission.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Nombre para Mostrar
                  </label>
                  <p className="text-sm text-gray-900">{permission.display_name}</p>
                </div>
                {permission.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descripción
                    </label>
                    <p className="text-sm text-gray-900">{permission.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Módulo
                  </label>
                  <Badge variant="info" className="capitalize">
                    {permission.module?.replace('_', ' ') || '-'}
                  </Badge>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas</h2>
              <dl className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Roles con este Permiso
                  </label>
                  <p className="text-2xl font-bold text-gray-900">{permission.roles_count || 0}</p>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        {/* Roles con este Permiso */}
        {permission.roles && permission.roles.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <KeyIcon className="h-5 w-5" />
              Roles con este Permiso ({permission.roles.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {permission.roles.map((role) => (
                <Badge key={role.id} variant="info">
                  {role.display_name}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Permiso"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          ¿Estás seguro de que deseas eliminar el permiso <strong>{permission.display_name}</strong>?
          Esta acción no se puede deshacer.
        </p>
        {permission.roles_count > 0 && (
          <Alert variant="warning" className="mt-4">
            Este permiso está asignado a {permission.roles_count} rol(es). No se puede eliminar hasta que se quite de todos los roles.
          </Alert>
        )}
      </Modal>
    </AppLayout>
  );
}

