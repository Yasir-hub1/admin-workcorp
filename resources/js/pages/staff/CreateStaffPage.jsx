import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, MapPinIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import Loading from '../../components/common/Loading';
import LocationMapModal from '../../components/common/LocationMapModal';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateStaffPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    employee_number: '',
    first_name: '',
    last_name: '',
    document_type: 'ci',
    document_number: '',
    birth_date: '',
    gender: '',
    nationality: '',
    phone: '',
    mobile: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    address: '',
    city: '',
    state: '',
    hire_date: '',
    contract_start_date: '',
    contract_end_date: '',
    contract_type: '',
    position: '',
    area_id: '',
    job_description: '',
    latitude: '',
    longitude: '',
    is_active: true,
    notes: '',
    // Sueldo inicial
    initial_salary: '',
    salary_currency: 'BOB',
    salary_type: 'monthly',
    salary_effective_date: '',
    salary_notes: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Obtener personal si está en modo edición
  const { data: staffData, isLoading: loadingStaff } = useQuery({
    queryKey: ['staff', id],
    queryFn: async () => {
      const response = await apiClient.get(`/staff/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });


  // Obtener áreas
  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await apiClient.get('/areas');
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del personal
  useEffect(() => {
    if (isEditMode && staffData && !isFormInitialized) {
      setFormData({
        employee_number: staffData.employee_number || '',
        first_name: staffData.first_name || '',
        last_name: staffData.last_name || '',
        document_type: staffData.document_type || 'ci',
        document_number: staffData.document_number || '',
        birth_date: staffData.birth_date || '',
        gender: staffData.gender || '',
        nationality: staffData.nationality || '',
        phone: staffData.phone || '',
        mobile: staffData.mobile || '',
        emergency_contact_name: staffData.emergency_contact_name || '',
        emergency_contact_phone: staffData.emergency_contact_phone || '',
        address: staffData.address || '',
        city: staffData.city || '',
        state: staffData.state || '',
        hire_date: staffData.hire_date || '',
        contract_start_date: staffData.contract_start_date || '',
        contract_end_date: staffData.contract_end_date || '',
        contract_type: staffData.contract_type || '',
        position: staffData.position || '',
        area_id: staffData.area_id?.toString() || '',
        job_description: staffData.job_description || '',
        latitude: staffData.latitude?.toString() || '',
        longitude: staffData.longitude?.toString() || '',
        is_active: staffData.is_active ?? true,
        notes: staffData.notes || '',
        initial_salary: '',
        salary_currency: 'BOB',
        salary_type: 'monthly',
        salary_effective_date: '',
        salary_notes: '',
      });
      setIsFormInitialized(true);
    }
  }, [staffData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/staff', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['staff']);
      toast.success('Personal creado correctamente');
      navigate(`/staff/${data.data.id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al crear personal';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/staff/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['staff']);
      queryClient.invalidateQueries(['staff', id]);
      toast.success('Personal actualizado correctamente');
      navigate(`/staff/${id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al actualizar personal';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      area_id: formData.area_id ? parseInt(formData.area_id) : null,
      is_active: formData.is_active === true || formData.is_active === 'true',
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
    };

    // Limpiar campos vacíos
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === '' || submitData[key] === null) {
        delete submitData[key];
      }
    });

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Manejar selección de ubicación desde el mapa
  const handleLocationSelect = (lat, lng, address) => {
    setFormData({
      ...formData,
      latitude: lat.toString(),
      longitude: lng.toString(),
      address: address || formData.address,
    });
    toast.success('Ubicación seleccionada correctamente');
  };

  if (isEditMode && loadingStaff) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
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
                {isEditMode ? 'Editar Personal' : 'Nuevo Personal'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del personal' : 'Registra un nuevo miembro del personal'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos Básicos */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos Básicos</h2>
              {!isEditMode && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Nota:</strong> Primero registra los datos del personal. Luego, desde la sección de <strong>Usuarios</strong>, podrás crear una cuenta de acceso para este personal.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Número de Empleado"
                  value={formData.employee_number}
                  onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                  placeholder="Número de empleado"
                />
                <Input
                  label="Nombre *"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                  placeholder="Nombre"
                />
                <Input
                  label="Apellido *"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                  placeholder="Apellido"
                />
                <Select
                  label="Tipo de Documento *"
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  required
                  options={[
                    { value: 'ci', label: 'CI (Cédula de Identidad)' },
                    { value: 'nit', label: 'NIT' },
                    { value: 'passport', label: 'Pasaporte' },
                    { value: 'other', label: 'Otro' },
                  ]}
                />
                <Input
                  label="Número de Documento *"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  required
                  placeholder="Número de documento"
                />
                <Input
                  label="Fecha de Nacimiento"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
                <Select
                  label="Género"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar género' },
                    { value: 'male', label: 'Masculino' },
                    { value: 'female', label: 'Femenino' },
                    { value: 'other', label: 'Otro' },
                  ]}
                />
                <Input
                  label="Nacionalidad"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="Nacionalidad"
                />
              </div>
            </div>

            {/* Información de Contacto */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Contacto</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Teléfono"
                />
                <Input
                  label="Móvil"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="Móvil"
                />
                <Input
                  label="Contacto de Emergencia"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  placeholder="Nombre del contacto"
                />
                <Input
                  label="Teléfono de Emergencia"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  placeholder="Teléfono de emergencia"
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Dirección"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Ciudad"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Ciudad"
                />
                <Input
                  label="Departamento"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Departamento"
                />
              </div>
            </div>

            {/* Información Laboral */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Laboral</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Fecha de Ingreso *"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  required
                />
                <Input
                  label="Cargo/Posición"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Cargo o posición"
                />
                <Select
                  label="Área"
                  value={formData.area_id}
                  onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar área' },
                    ...(areasData?.map(area => ({
                      value: area.id.toString(),
                      label: area.name,
                    })) || []),
                  ]}
                />
                <Select
                  label="Tipo de Contrato"
                  value={formData.contract_type}
                  onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar tipo' },
                    { value: 'full_time', label: 'Tiempo Completo' },
                    { value: 'part_time', label: 'Medio Tiempo' },
                    { value: 'contractor', label: 'Contratista' },
                    { value: 'intern', label: 'Interno' },
                  ]}
                />
                <Input
                  label="Fecha Inicio Contrato"
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                />
                <Input
                  label="Fecha Fin Contrato"
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Descripción del Puesto"
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  rows={3}
                  placeholder="Descripción del puesto de trabajo"
                />
              </div>
            </div>

            {/* Ubicación del Domicilio */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ubicación del Domicilio</h2>
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Dirección"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Dirección completa"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLocationModal(true)}
                    icon={MapPinIcon}
                  >
                    Seleccionar en Mapa
                  </Button>
                </div>
                {(formData.latitude && formData.longitude) && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Latitud"
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="Latitud"
                    />
                    <Input
                      label="Longitud"
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="Longitud"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sueldo Inicial (Solo al crear) */}
            {!isEditMode && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sueldo Inicial (Opcional)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Monto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.initial_salary}
                    onChange={(e) => setFormData({ ...formData, initial_salary: e.target.value })}
                    placeholder="0.00"
                  />
                  <Select
                    label="Moneda"
                    value={formData.salary_currency}
                    onChange={(e) => setFormData({ ...formData, salary_currency: e.target.value })}
                    options={[
                      { value: 'BOB', label: 'BOB (Bolivianos)' },
                    ]}
                  />
                  <Select
                    label="Tipo de Sueldo"
                    value={formData.salary_type}
                    onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}
                    options={[
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'biweekly', label: 'Quincenal' },
                      { value: 'weekly', label: 'Semanal' },
                      { value: 'annual', label: 'Anual' },
                    ]}
                  />
                  <Input
                    label="Fecha Efectiva"
                    type="date"
                    value={formData.salary_effective_date}
                    onChange={(e) => setFormData({ ...formData, salary_effective_date: e.target.value })}
                  />
                </div>
                <div className="mt-4">
                  <Textarea
                    label="Notas del Sueldo"
                    value={formData.salary_notes}
                    onChange={(e) => setFormData({ ...formData, salary_notes: e.target.value })}
                    rows={2}
                    placeholder="Notas adicionales sobre el sueldo"
                  />
                </div>
              </div>
            )}

            {/* Notas y Estado */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas y Estado</h2>
              <div className="space-y-4">
                <Textarea
                  label="Notas"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Notas adicionales"
                />
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Personal activo</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/staff')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar' : 'Crear'} Personal
              </Button>
            </div>
          </form>
        </Card>

        {/* Modal de Ubicación */}
        <LocationMapModal
          open={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onConfirm={handleLocationSelect}
          initialLat={formData.latitude ? parseFloat(formData.latitude) : null}
          initialLng={formData.longitude ? parseFloat(formData.longitude) : null}
          address={formData.address}
        />
      </div>
    </AppLayout>
  );
}

