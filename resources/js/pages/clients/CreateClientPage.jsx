import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import Loading from '../../components/common/Loading';
import ValidationErrorModal from '../../components/common/ValidationErrorModal';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateClientPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    business_name: '',
    legal_name: '',
    document_type: 'nit',
    document_number: '',
    client_type: 'company',
    industry: '',
    company_size: '',
    phone: '',
    email: '',
    fiscal_address: '',
    website: '',
    registration_date: '',
    source: '',
    category: '',
    status: 'active',
    assigned_to: '',
    area_id: '',
    notes: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Obtener cliente si está en modo edición
  const { data: clientData, isLoading: loadingClient } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      const response = await apiClient.get(`/clients/${id}`);
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

  // Obtener usuarios para asignación
  const { data: usersData } = useQuery({
    queryKey: ['users-for-clients'],
    queryFn: async () => {
      const users = [];
      try {
        const areasResponse = await apiClient.get('/areas');
        const areas = areasResponse.data.data || [];
        
        for (const area of areas) {
          try {
            const areaResponse = await apiClient.get(`/areas/${area.id}`);
            if (areaResponse.data.data?.staff) {
              users.push(...areaResponse.data.data.staff);
            }
          } catch (error) {
            // Ignorar errores individuales
          }
        }
      } catch (error) {
        console.error('Error obteniendo usuarios:', error);
      }
      
      const uniqueUsers = users.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );
      
      return uniqueUsers;
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del cliente
  useEffect(() => {
    if (isEditMode && clientData && !isFormInitialized) {
      setFormData({
        business_name: clientData.business_name || '',
        legal_name: clientData.legal_name || '',
        document_type: clientData.document_type || 'nit',
        document_number: clientData.document_number || '',
        client_type: clientData.client_type || 'company',
        industry: clientData.industry || '',
        company_size: clientData.company_size || '',
        phone: clientData.phone || '',
        email: clientData.email || '',
        fiscal_address: clientData.fiscal_address || '',
        website: clientData.website || '',
        registration_date: clientData.registration_date || '',
        source: clientData.source || '',
        category: clientData.category || '',
        status: clientData.status || 'active',
        assigned_to: clientData.assigned_user?.id?.toString() || '',
        area_id: clientData.area?.id?.toString() || '',
        notes: clientData.notes || '',
      });
      setIsFormInitialized(true);
    }
  }, [clientData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/clients', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['clients']);
      toast.success('Cliente creado correctamente');
      navigate(`/clients/${data.data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear cliente');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/clients/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      queryClient.invalidateQueries(['client', id]);
      toast.success('Cliente actualizado correctamente');
      navigate(`/clients/${id}`);
    },
    onError: (error) => {
      const errors = error.response?.data?.errors || {};
      const errorMessage = error.response?.data?.message;
      
      // Si hay errores de validación, mostrarlos en el modal
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        setShowValidationModal(true);
        
        // También mostrar un toast con un resumen
        const errorFields = Object.keys(errors).map(field => {
          const fieldNames = {
            document_number: 'Número de Documento',
            business_name: 'Razón Social / Nombre',
            document_type: 'Tipo de Documento',
            client_type: 'Tipo de Cliente',
            status: 'Estado',
          };
          return fieldNames[field] || field;
        }).join(', ');
        
        toast.error(`Por favor corrige los siguientes campos: ${errorFields}`, {
          duration: 5000,
        });
      } else {
        // Si no hay errores de validación, mostrar el mensaje general
        toast.error(errorMessage || 'Error al actualizar cliente');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
      area_id: formData.area_id ? parseInt(formData.area_id) : null,
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

  if (isEditMode && loadingClient) {
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
              onClick={() => navigate('/clients')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del cliente' : 'Registra un nuevo cliente en el sistema'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Básica</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Tipo de Cliente *"
                  value={formData.client_type}
                  onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                  required
                  options={[
                    { value: 'company', label: 'Empresa' },
                    { value: 'individual', label: 'Persona Natural' },
                  ]}
                />
                <Input
                  label={formData.client_type === 'company' ? 'Razón Social *' : 'Nombre Completo *'}
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  required
                  placeholder={formData.client_type === 'company' ? 'Razón social' : 'Nombre completo'}
                />
                {formData.client_type === 'company' && (
                  <Input
                    label="Nombre Legal"
                    value={formData.legal_name}
                    onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                    placeholder="Nombre legal"
                  />
                )}
                <Select
                  label="Tipo de Documento *"
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  required
                  options={[
                    { value: 'nit', label: 'NIT' },
                    { value: 'ci', label: 'CI (Cédula de Identidad)' },
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
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
                <Input
                  label="Teléfono"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Teléfono de contacto"
                />
                <Input
                  label="Sitio Web"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://ejemplo.com"
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Dirección Fiscal"
                  value={formData.fiscal_address}
                  onChange={(e) => setFormData({ ...formData, fiscal_address: e.target.value })}
                  rows={2}
                  placeholder="Dirección fiscal completa"
                />
              </div>
            </div>

            {/* Información Comercial */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Comercial</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Rubro/Industria"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="Rubro o industria"
                />
                {formData.client_type === 'company' && (
                  <Select
                    label="Tamaño de Empresa"
                    value={formData.company_size}
                    onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                    options={[
                      { value: '', label: 'Seleccionar tamaño' },
                      { value: 'small', label: 'Pequeña' },
                      { value: 'medium', label: 'Mediana' },
                      { value: 'large', label: 'Grande' },
                    ]}
                  />
                )}
                <Input
                  label="Fecha de Registro"
                  type="date"
                  value={formData.registration_date}
                  onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                />
                <Select
                  label="Origen"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar origen' },
                    { value: 'referred', label: 'Referido' },
                    { value: 'marketing', label: 'Marketing' },
                    { value: 'direct_sale', label: 'Venta Directa' },
                  ]}
                />
                <Select
                  label="Categoría"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={[
                    { value: '', label: 'Seleccionar categoría' },
                    { value: 'A', label: 'Categoría A' },
                    { value: 'B', label: 'Categoría B' },
                    { value: 'C', label: 'Categoría C' },
                  ]}
                />
                <Select
                  label="Estado *"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  options={[
                    { value: 'active', label: 'Activo' },
                    { value: 'inactive', label: 'Inactivo' },
                    { value: 'prospect', label: 'Prospecto' },
                    { value: 'lost', label: 'Perdido' },
                  ]}
                />
              </div>
            </div>

            {/* Asignación */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Asignación</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  label="Ejecutivo Asignado"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  options={[
                    { value: '', label: 'Sin asignar' },
                    ...(usersData?.map(user => ({
                      value: user.id.toString(),
                      label: `${user.name} (${user.email})`,
                    })) || []),
                  ]}
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <Textarea
                label="Notas"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Notas adicionales sobre el cliente"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/clients')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar Cliente' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Modal de Errores de Validación */}
        <ValidationErrorModal
          open={showValidationModal}
          onClose={() => {
            setShowValidationModal(false);
            setValidationErrors({});
          }}
          errors={validationErrors}
          title="Errores de Validación"
        />
      </div>
    </AppLayout>
  );
}

