import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import MultiSelect from '../../components/common/MultiSelect';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function AreaDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);

  // Obtener área
  const { data: areaData, isLoading: loadingArea, error: areaError } = useQuery({
    queryKey: ['area', id],
    queryFn: async () => {
      const response = await apiClient.get(`/areas/${id}`);
      return response.data.data;
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  const area = areaData;

  // Verificar permisos
  const canEdit = area && isSuperAdmin();
  const canDelete = area && isSuperAdmin();
  const canAssignStaff = isSuperAdmin() || hasPermission('areas.assign-members');

  // Obtener personal activo para asignación
  const { data: staffData } = useQuery({
    queryKey: ['staff-for-area-members'],
    queryFn: async () => {
      const response = await apiClient.get('/staff', { params: { is_active: true, per_page: 1000 } });
      return response.data.data || [];
    },
    enabled: !!area && isAuthenticated && !!user && canAssignStaff,
  });

  const staffOptions = useMemo(() => {
    if (!staffData) return [];
    return staffData.map((s) => {
      const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim();
      const display = fullName || s.full_name || s.user?.name || s.user?.email || (s.employee_number ? `N° ${s.employee_number}` : 'Sin nombre');
      const position = s.position ? ` - ${s.position}` : '';
      return { value: String(s.id), label: `${display}${position}` };
    });
  }, [staffData]);

  const currentStaffIds = useMemo(() => {
    const list = (area?.staff_members || area?.staffMembers || []).map((s) => String(s.id));
    return list;
  }, [area]);

  // Inicializar selección cuando se abre el modal (siempre antes de returns para no romper orden de hooks)
  useEffect(() => {
    if (!showAssignModal) return;
    setSelectedStaffIds(currentStaffIds);
  }, [showAssignModal, currentStaffIds]);

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/areas/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['areas']);
      toast.success('Área eliminada correctamente');
      navigate('/areas');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar área');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteModal(false);
  };

  const assignStaffMutation = useMutation({
    mutationFn: async (staffIds) => {
      const response = await apiClient.post(`/areas/${id}/staff-members`, {
        staff_ids: staffIds.map((v) => parseInt(v, 10)),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['area', id]);
      toast.success('Personal asignado correctamente');
      setShowAssignModal(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al asignar personal');
    },
  });

  // Loading state
  if (loadingArea) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (areaError || !area) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert variant="error" title="Error">
            {areaError?.response?.data?.message || 'Área no encontrada'}
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
              onClick={() => navigate('/areas')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {area.name}
              </h1>
              {area.code && (
                <p className="mt-1 text-sm text-gray-500">
                  Código: {area.code}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/areas/${id}/edit`)}
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
                {/* Logo */}
                {area.logo_path && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Logo
                    </label>
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${area.logo_path}`}
                      alt={`Logo de ${area.name}`}
                      className="h-24 w-24 object-contain border border-gray-300 rounded-lg p-2 bg-white"
                    />
                  </div>
                )}
                
                {/* Colores */}
                {area.colors && Array.isArray(area.colors) && area.colors.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">
                      Colores del Área
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {area.colors.map((color, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="w-10 h-10 rounded border border-gray-300 shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                          <span className="text-xs text-gray-600 font-mono">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Nombre
                  </label>
                  <p className="text-sm text-gray-900">{area.name}</p>
                </div>
                {area.code && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Código
                    </label>
                    <p className="text-sm text-gray-900">{area.code}</p>
                  </div>
                )}
                {area.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Descripción
                    </label>
                    <p className="text-sm text-gray-900">{area.description}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Estado
                  </label>
                  <Badge variant={area.is_active ? 'success' : 'secondary'}>
                    {area.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
              </dl>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h2>
              <dl className="space-y-3">
                {area.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Teléfono
                    </label>
                    <p className="text-sm text-gray-900 flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      {area.phone}
                    </p>
                  </div>
                )}
                {area.budget_monthly && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Presupuesto Mensual
                    </label>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4" />
                      {formatCurrency(area.budget_monthly)}
                    </p>
                  </div>
                )}
                {area.budget_annual && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Presupuesto Anual
                    </label>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      <CurrencyDollarIcon className="h-4 w-4" />
                      {formatCurrency(area.budget_annual)}
                    </p>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </Card>

        {/* Jefes de Área */}
        {area.managers && area.managers.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Jefes de Área
            </h2>
            <div className="flex flex-wrap gap-2">
              {area.managers.map((manager) => {
                const fullName = manager.first_name || manager.last_name
                  ? `${manager.first_name || ''} ${manager.last_name || ''}`.trim()
                  : manager.full_name || manager.user?.name || manager.user?.email || manager.employee_number || 'Sin nombre';
                return (
                  <Badge key={manager.id || manager.pivot?.staff_id} variant="info">
                    {fullName}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        {/* Personal Asignado */}
        <Card>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5" />
              Personal Asignado
            </h2>
            {canAssignStaff && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignModal(true);
                }}
              >
                Asignar personal
              </Button>
            )}
          </div>

          {(area.staff_members && area.staff_members.length > 0) ? (
            <div className="space-y-2">
              {area.staff_members.map((staff) => {
                const fullName = staff.first_name || staff.last_name
                  ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
                  : staff.full_name || staff.name || staff.email || staff.employee_number || 'Sin nombre';
                return (
                  <div key={staff.id} className="flex items-center justify-between p-2 border border-gray-200 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fullName}</p>
                      {staff.position && (
                        <p className="text-xs text-gray-500">{staff.position}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No hay personal asignado a esta área.
            </div>
          )}
          <div className="mt-3 text-xs text-gray-500">
            Nota: un personal puede pertenecer a <span className="font-semibold">varias áreas</span>.
          </div>
        </Card>

        {/* (legacy) staff por users.area_id */}
        {(area.staff && area.staff.length > 0) ? (
          <Card>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Personal (relación antigua)</h3>
            <div className="text-xs text-gray-500 mb-3">
              Esta lista viene de <span className="font-mono">users.area_id</span>. Para multi-área usa la asignación anterior.
            </div>
            <div className="space-y-2">
              {area.staff.map((u) => (
                <div key={u.id} className="p-2 border border-gray-200 rounded">
                  <div className="text-sm font-medium text-gray-900">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {/* Delete Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Eliminar Área"
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
          ¿Estás seguro de que deseas eliminar el área <strong>{area.name}</strong>?
          Esta acción no se puede deshacer.
        </p>
        {area.children && area.children.length > 0 && (
          <Alert variant="warning" className="mt-4">
            Esta área tiene {area.children.length} sub-área(s). No se puede eliminar hasta que se eliminen o reasignen las sub-áreas.
          </Alert>
        )}
      </Modal>

      {/* Assign Personal Modal */}
      <Modal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Asignar personal a esta área"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => assignStaffMutation.mutate(selectedStaffIds)}
              loading={assignStaffMutation.isPending}
            >
              Guardar asignación
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Selecciona el personal que pertenece a <span className="font-semibold">{area.name}</span>. Un mismo personal puede estar en varias áreas.
          </div>
          <MultiSelect
            name="area_staff_members"
            label="Personal"
            value={selectedStaffIds}
            onChange={(values) => setSelectedStaffIds(values)}
            options={staffOptions}
            placeholder="Buscar y seleccionar personal..."
          />
          <div className="text-xs text-gray-500">
            Consejo: si no ves a alguien, verifica que esté activo en el módulo Personal.
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

