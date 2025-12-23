import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function UserDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Obtener usuario
  const { data: userData, isLoading: loadingUser, error: userError, refetch } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/users/${id}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const userDetail = userData;

  // Verificar permisos
  const canEdit = userDetail && isSuperAdmin();
  const canDelete = userDetail && isSuperAdmin() && userDetail.id !== user?.id;

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Usuario eliminado correctamente');
      navigate('/users');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar usuario');
    },
  });

  // Loading state
  if (loadingUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (userError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {userError.response?.data?.message || 'Error al cargar el usuario'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/users')}>
            Volver a Usuarios
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No user found
  if (!userDetail) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Usuario no encontrado
          </Alert>
          <Button variant="outline" onClick={() => navigate('/users')}>
            Volver a Usuarios
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
              onClick={() => navigate('/users')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {userDetail.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {userDetail.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/users/${id}/edit`)}
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
                className="text-red-600 hover:text-red-700"
              >
                Eliminar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Información Principal */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Información del Usuario">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Nombre
                    </label>
                    <p className="text-sm text-gray-900">{userDetail.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Email
                    </label>
                    <p className="text-sm text-gray-900">{userDetail.email}</p>
                  </div>
                  {userDetail.area && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Área
                      </label>
                      <p className="text-sm text-gray-900">{userDetail.area.name}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Estado
                    </label>
                    <Badge variant={userDetail.is_active ? 'success' : 'secondary'}>
                      {userDetail.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Idioma
                    </label>
                    <p className="text-sm text-gray-900">
                      {userDetail.language === 'es' ? 'Español' : 'English'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Zona Horaria
                    </label>
                    <p className="text-sm text-gray-900">{userDetail.timezone || '-'}</p>
                  </div>
                  {userDetail.last_login_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Último Acceso
                      </label>
                      <p className="text-sm text-gray-900">{formatDate(userDetail.last_login_at)}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Fecha de Registro
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(userDetail.created_at)}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Roles y Permisos */}
            <Card title="Roles y Permisos">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Roles Asignados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {userDetail.role_names && userDetail.role_names.length > 0 ? (
                      userDetail.role_names.map((role, idx) => (
                        <Badge key={idx} variant="info">
                          {role === 'super_admin' ? 'Super Admin' :
                           role === 'jefe_area' ? 'Jefe de Área' : 'Personal'}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Sin roles asignados</span>
                    )}
                  </div>
                </div>
                {userDetail.permission_names && userDetail.permission_names.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permisos ({userDetail.permission_names.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {userDetail.permission_names.slice(0, 10).map((permission, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {userDetail.permission_names.length > 10 && (
                        <Badge variant="secondary" className="text-xs">
                          +{userDetail.permission_names.length - 10} más
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Personal Asociado */}
            {userDetail.staff && (
              <Card title="Personal Asociado">
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Número de Empleado
                    </label>
                    <p className="text-sm text-gray-900">
                      {userDetail.staff.employee_number || '-'}
                    </p>
                  </div>
                  {userDetail.staff.position && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Cargo
                      </label>
                      <p className="text-sm text-gray-900">{userDetail.staff.position}</p>
                    </div>
                  )}
                  {userDetail.staff.area && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Área
                      </label>
                      <p className="text-sm text-gray-900">{userDetail.staff.area.name}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-200">
                    <Link
                      to={`/staff/${userDetail.staff.id}`}
                      className="text-sm text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      Ver detalles del personal →
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {/* Información Adicional */}
            <Card title="Información Adicional">
              <div className="space-y-2">
                {userDetail.has_two_factor && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Autenticación 2FA</span>
                    <Badge variant="success">Activa</Badge>
                  </div>
                )}
                {userDetail.email_verified_at && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Email Verificado
                    </label>
                    <p className="text-sm text-gray-900">
                      {formatDate(userDetail.email_verified_at)}
                    </p>
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
          title="Eliminar Usuario"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
              >
                Eliminar
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-500">
            ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.
          </p>
        </Modal>
      </div>
    </AppLayout>
  );
}

