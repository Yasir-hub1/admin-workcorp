import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UsersIcon,
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

export default function RoleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Obtener rol
  const { data: roleData, isLoading: loadingRole, error: roleError } = useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      const response = await apiClient.get(`/roles/${id}`);
      return response.data.data;
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const role = roleData;

  // Verificar permisos
  const canEdit = role && isSuperAdmin();
  const canDelete = role && isSuperAdmin() && !['super_admin', 'jefe_area', 'personal'].includes(role.name);

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/roles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Rol eliminado correctamente');
      navigate('/roles');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar rol');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteModal(false);
  };

  // Loading state
  if (loadingRole) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (roleError || !role) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert variant="error" title="Error">
            {roleError?.response?.data?.message || 'Rol no encontrado'}
          </Alert>
        </div>
      </AppLayout>
    );
  }

  // Agrupar permisos por módulo
  const permissionsByModule = (role.permissions || []).reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/roles')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {role.display_name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {role.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/roles/${id}/edit`)}
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
                    Nombre del Rol
                  </label>
                  <p className="text-sm text-gray-900">{role.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Nombre para Mostrar
                  </label>
                  <p className="text-sm text-gray-900">{role.display_name}</p>
                </div>
                {role.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descripción
                    </label>
                    <p className="text-sm text-gray-900">{role.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Nivel
                  </label>
                  <Badge
                    variant={role.level === 1 ? 'danger' : role.level === 2 ? 'warning' : 'info'}
                  >
                    {role.level_label}
                  </Badge>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas</h2>
              <dl className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Permisos Asignados
                  </label>
                  <p className="text-2xl font-bold text-gray-900">{role.permissions_count || 0}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Usuarios con este Rol
                  </label>
                  <p className="text-2xl font-bold text-gray-900">{role.users_count || 0}</p>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        {/* Permisos */}
        {role.permissions && role.permissions.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Permisos Asignados ({role.permissions.length})
            </h2>
            <div className="space-y-4">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                    {module.replace('_', ' ')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {perms.map((perm) => (
                      <Badge key={perm.id} variant="info">
                        {perm.display_name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Rol"
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
          ¿Estás seguro de que deseas eliminar el rol <strong>{role.display_name}</strong>?
          Esta acción no se puede deshacer.
        </p>
        {role.users_count > 0 && (
          <Alert variant="warning" className="mt-4">
            Este rol tiene {role.users_count} usuario(s) asignado(s). No se puede eliminar hasta que se reasignen los usuarios.
          </Alert>
        )}
      </Modal>
    </AppLayout>
  );
}

