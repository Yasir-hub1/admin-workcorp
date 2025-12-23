import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Alert from '../../components/common/Alert';
import Modal from '../../components/common/Modal';
import LocationMapModal from '../../components/common/LocationMapModal';
import LocationViewModal from '../../components/common/LocationViewModal';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import { formatDate, formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function StaffDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showViewLocationModal, setShowViewLocationModal] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'salaries'

  const [salaryFormData, setSalaryFormData] = useState({
    amount: '',
    currency: 'BOB',
    effective_date: '',
    end_date: '',
    salary_type: 'monthly',
    notes: '',
  });

  // Obtener personal
  const { data: staffData, isLoading: loadingStaff, error: staffError, refetch } = useQuery({
    queryKey: ['staff', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/staff/${id}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching staff:', error);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener historial de sueldos
  const { data: salariesData, isLoading: loadingSalaries, refetch: refetchSalaries } = useQuery({
    queryKey: ['staff-salaries', id],
    queryFn: async () => {
      const response = await apiClient.get(`/staff/${id}/salaries`);
      return response.data.data || [];
    },
    enabled: !!id && isAuthenticated && !!user && activeTab === 'salaries',
  });

  const staff = staffData;

  // Verificar permisos
  const canEdit = staff && isSuperAdmin();
  const canDelete = staff && isSuperAdmin();

  // Mutation para eliminar
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/staff/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      toast.success('Personal eliminado correctamente');
      navigate('/staff');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar personal');
    },
  });

  // Mutation para actualizar ubicación GPS
  const updateLocationMutation = useMutation({
    mutationFn: async (location) => {
      const response = await apiClient.post(`/staff/${id}/location`, location);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff', id]);
      toast.success('Ubicación actualizada correctamente');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar ubicación');
    },
  });

  // Mutation para crear sueldo
  const createSalaryMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/staff/${id}/salaries`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff-salaries', id]);
      queryClient.invalidateQueries(['staff', id]);
      setShowSalaryModal(false);
      setSalaryFormData({
        amount: '',
        currency: 'BOB',
        effective_date: '',
        end_date: '',
        salary_type: 'monthly',
        notes: '',
      });
      toast.success('Sueldo registrado correctamente');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al registrar sueldo';
      toast.error(errorMessage);
    },
  });

  // Manejar selección de ubicación desde el mapa
  const handleLocationSelect = (lat, lng, address) => {
    updateLocationMutation.mutate({
      latitude: lat,
      longitude: lng,
    });
    if (address) {
      toast.success('Ubicación actualizada correctamente');
    }
  };

  const handleSalarySubmit = (e) => {
    e.preventDefault();
    createSalaryMutation.mutate(salaryFormData);
  };

  // Loading state
  if (loadingStaff) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (staffError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {staffError.response?.data?.message || 'Error al cargar el personal'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/staff')}>
            Volver a Personal
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No staff found
  if (!staff) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Personal no encontrado
          </Alert>
          <Button variant="outline" onClick={() => navigate('/staff')}>
            Volver a Personal
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
              onClick={() => navigate('/staff')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {staff.first_name || staff.last_name
                  ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
                  : staff.full_name || staff.user?.name || 'Personal'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {staff.position || 'Sin cargo asignado'}
                {staff.area && ` • ${staff.area.name}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/staff/${id}/edit`)}
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('info')}
              className={`${
                activeTab === 'info'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('salaries')}
              className={`${
                activeTab === 'salaries'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Historial de Sueldos
              {staff.salaries_count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {staff.salaries_count}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Información Personal */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Información Personal">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Usuario
                      </label>
                      <p className="text-sm text-gray-900">
                        {staff.first_name || staff.last_name
                          ? `${staff.first_name || ''} ${staff.last_name || ''}`.trim()
                          : staff.full_name || staff.user?.name || '-'}
                      </p>
                      <p className="text-xs text-gray-500">{staff.user?.email || ''}</p>
                    </div>
                    {staff.employee_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Número de Empleado
                        </label>
                        <p className="text-sm text-gray-900">{staff.employee_number}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Documento
                      </label>
                      <p className="text-sm text-gray-900">
                        {staff.document_type?.toUpperCase() === 'CI' ? 'CI' : staff.document_type?.toUpperCase() === 'NIT' ? 'NIT' : staff.document_type?.toUpperCase() || 'CI'}: {staff.document_number || '-'}
                      </p>
                    </div>
                    {staff.birth_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Fecha de Nacimiento
                        </label>
                        <p className="text-sm text-gray-900">{formatDate(staff.birth_date)}</p>
                      </div>
                    )}
                    {staff.gender && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Género
                        </label>
                        <p className="text-sm text-gray-900">
                          {staff.gender === 'male' ? 'Masculino' :
                           staff.gender === 'female' ? 'Femenino' : 'Otro'}
                        </p>
                      </div>
                    )}
                    {staff.nationality && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Nacionalidad
                        </label>
                        <p className="text-sm text-gray-900">{staff.nationality}</p>
                      </div>
                    )}
                  </div>
                  {(staff.phone || staff.mobile) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {staff.phone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Teléfono
                          </label>
                          <p className="text-sm text-gray-900">{staff.phone}</p>
                        </div>
                      )}
                      {staff.mobile && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">
                            Móvil
                          </label>
                          <p className="text-sm text-gray-900">{staff.mobile}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {staff.address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Dirección
                      </label>
                      <p className="text-sm text-gray-900">{staff.address}</p>
                      {(staff.city || staff.state) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {[staff.city, staff.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                  {(staff.emergency_contact_name || staff.emergency_contact_phone) && (
                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contacto de Emergencia
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {staff.emergency_contact_name && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Nombre
                            </label>
                            <p className="text-sm text-gray-900">{staff.emergency_contact_name}</p>
                          </div>
                        )}
                        {staff.emergency_contact_phone && (
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Teléfono
                            </label>
                            <p className="text-sm text-gray-900">{staff.emergency_contact_phone}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Información Laboral">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Fecha de Ingreso
                      </label>
                      <p className="text-sm text-gray-900">
                        {staff.hire_date ? formatDate(staff.hire_date) : '-'}
                      </p>
                    </div>
                    {staff.position && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Cargo/Posición
                        </label>
                        <p className="text-sm text-gray-900">{staff.position}</p>
                      </div>
                    )}
                    {staff.area && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Área
                        </label>
                        <p className="text-sm text-gray-900">{staff.area.name}</p>
                      </div>
                    )}
                    {staff.contract_type && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Tipo de Contrato
                        </label>
                        <p className="text-sm text-gray-900">
                          {staff.contract_type === 'full_time' ? 'Tiempo Completo' :
                           staff.contract_type === 'part_time' ? 'Medio Tiempo' :
                           staff.contract_type === 'contractor' ? 'Contratista' : 'Interno'}
                        </p>
                      </div>
                    )}
                    {staff.contract_start_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Inicio de Contrato
                        </label>
                        <p className="text-sm text-gray-900">{formatDate(staff.contract_start_date)}</p>
                      </div>
                    )}
                    {staff.contract_end_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Fin de Contrato
                        </label>
                        <p className="text-sm text-gray-900">{formatDate(staff.contract_end_date)}</p>
                      </div>
                    )}
                  </div>
                  {staff.job_description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Descripción del Puesto
                      </label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{staff.job_description}</p>
                    </div>
                  )}
                </div>
              </Card>

              {staff.notes && (
                <Card title="Notas">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{staff.notes}</p>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Estado y Sueldo Actual */}
              <Card>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Estado
                    </label>
                    <Badge variant={staff.is_active ? 'success' : 'secondary'}>
                      {staff.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  {staff.current_salary && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Sueldo Actual
                      </label>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(staff.current_salary.amount)} {staff.current_salary.currency}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {staff.current_salary.salary_type_label} • Desde {formatDate(staff.current_salary.effective_date)}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Ubicación GPS */}
              {(staff.latitude && staff.longitude) && (
                <Card title="Ubicación GPS">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Latitud
                      </label>
                      <p className="text-sm text-gray-900">{staff.latitude}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Longitud
                      </label>
                      <p className="text-sm text-gray-900">{staff.longitude}</p>
                    </div>
                    {staff.location_updated_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Actualizado: {formatDate(staff.location_updated_at)}
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowViewLocationModal(true)}
                        icon={MapPinIcon}
                        className="flex-1"
                      >
                        Ver en Mapa
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowLocationModal(true)}
                          icon={MapPinIcon}
                          className="flex-1"
                        >
                          Actualizar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Áreas Gestionadas */}
              {staff.managed_areas && staff.managed_areas.length > 0 && (
                <Card title="Áreas Gestionadas">
                  <div className="space-y-2">
                    {staff.managed_areas.map((area) => (
                      <div key={area.id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-900">{area.name}</span>
                        {area.assigned_at && (
                          <span className="text-xs text-gray-500">
                            Desde {formatDate(area.assigned_at)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          /* Historial de Sueldos */
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Historial de Sueldos</h2>
              {canEdit && (
                <Button
                  icon={PlusIcon}
                  onClick={() => setShowSalaryModal(true)}
                  size="sm"
                >
                  Registrar Nuevo Sueldo
                </Button>
              )}
            </div>

            {loadingSalaries ? (
              <Loading />
            ) : salariesData && salariesData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Efectiva
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aprobado Por
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salariesData.map((salary) => (
                      <tr key={salary.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(salary.effective_date)}
                          {salary.end_date && (
                            <div className="text-xs text-gray-500">
                              Hasta: {formatDate(salary.end_date)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(salary.amount)} {salary.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {salary.salary_type_label}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={salary.is_active ? 'success' : 'secondary'}>
                            {salary.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {salary.approvedBy?.name || '-'}
                          {salary.approved_at && (
                            <div className="text-xs text-gray-500">
                              {formatDate(salary.approved_at)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {salary.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay sueldos registrados</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comienza registrando el primer sueldo
                </p>
                {canEdit && (
                  <div className="mt-6">
                    <Button
                      icon={PlusIcon}
                      onClick={() => setShowSalaryModal(true)}
                    >
                      Registrar Sueldo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Delete Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Eliminar Personal"
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
            ¿Estás seguro de que deseas eliminar este personal? Esta acción no se puede deshacer.
          </p>
        </Modal>

        {/* Salary Modal */}
        <Modal
          open={showSalaryModal}
          onClose={() => {
            setShowSalaryModal(false);
            setSalaryFormData({
              amount: '',
              currency: 'USD',
              effective_date: '',
              end_date: '',
              salary_type: 'monthly',
              notes: '',
            });
          }}
          title="Registrar Nuevo Sueldo"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSalaryModal(false);
                  setSalaryFormData({
                    amount: '',
                    currency: 'USD',
                    effective_date: '',
                    end_date: '',
                    salary_type: 'monthly',
                    notes: '',
                  });
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="salary-form"
                loading={createSalaryMutation.isPending}
              >
                Registrar Sueldo
              </Button>
            </>
          }
        >
          <form id="salary-form" onSubmit={handleSalarySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Monto *"
                type="number"
                step="0.01"
                min="0"
                value={salaryFormData.amount}
                onChange={(e) => setSalaryFormData({ ...salaryFormData, amount: e.target.value })}
                required
                placeholder="0.00"
              />
              <Select
                label="Moneda *"
                value={salaryFormData.currency}
                onChange={(e) => setSalaryFormData({ ...salaryFormData, currency: e.target.value })}
                required
                  options={[
                    { value: 'BOB', label: 'BOB (Bolivianos)' },
                  ]}
              />
              <Select
                label="Tipo de Sueldo *"
                value={salaryFormData.salary_type}
                onChange={(e) => setSalaryFormData({ ...salaryFormData, salary_type: e.target.value })}
                required
                options={[
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'biweekly', label: 'Quincenal' },
                  { value: 'weekly', label: 'Semanal' },
                  { value: 'annual', label: 'Anual' },
                ]}
              />
              <Input
                label="Fecha Efectiva *"
                type="date"
                value={salaryFormData.effective_date}
                onChange={(e) => setSalaryFormData({ ...salaryFormData, effective_date: e.target.value })}
                required
              />
              <Input
                label="Fecha Fin (Opcional)"
                type="date"
                value={salaryFormData.end_date}
                onChange={(e) => setSalaryFormData({ ...salaryFormData, end_date: e.target.value })}
              />
            </div>
            <Textarea
              label="Notas"
              value={salaryFormData.notes}
              onChange={(e) => setSalaryFormData({ ...salaryFormData, notes: e.target.value })}
              rows={3}
              placeholder="Notas adicionales sobre el sueldo"
            />
          </form>
        </Modal>

        {/* Location Map Modal (Edit) */}
        <LocationMapModal
          open={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onConfirm={handleLocationSelect}
          initialLat={staff?.latitude ? parseFloat(staff.latitude) : null}
          initialLng={staff?.longitude ? parseFloat(staff.longitude) : null}
          address={staff?.address || ''}
        />

        {/* Location View Modal (Read-only) */}
        <LocationViewModal
          open={showViewLocationModal}
          onClose={() => setShowViewLocationModal(false)}
          lat={staff?.latitude}
          lng={staff?.longitude}
          address={staff?.address}
        />
      </div>
    </AppLayout>
  );
}

