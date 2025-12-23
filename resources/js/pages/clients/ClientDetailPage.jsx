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
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
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
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { getStatusColor, getStatusLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function ClientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'kardex' o 'services'
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  // Obtener cliente
  const { data: clientData, isLoading: loadingClient, error: clientError, refetch } = useQuery({
    queryKey: ['client', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/clients/${id}`);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching client:', error);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener kardex
  const { data: kardexData, isLoading: loadingKardex } = useQuery({
    queryKey: ['client-kardex', id],
    queryFn: async () => {
      const response = await apiClient.get(`/clients/${id}/kardex`);
      return response.data.data;
    },
    enabled: !!id && isAuthenticated && !!user && activeTab === 'kardex',
  });

  // Obtener servicios del cliente
  const { data: servicesData, isLoading: loadingServices, refetch: refetchServices } = useQuery({
    queryKey: ['client-services', id],
    queryFn: async () => {
      const response = await apiClient.get('/services', {
        params: { client_id: id, per_page: 100 },
      });
      return response.data.data || [];
    },
    enabled: !!id && isAuthenticated && !!user && (activeTab === 'services' || activeTab === 'kardex'),
  });

  // Obtener áreas y usuarios para el formulario
  const { data: areasData } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => {
      const response = await apiClient.get('/areas');
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-for-services'],
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


  // Obtener categorías únicas de servicios existentes
  const { data: existingCategoriesData } = useQuery({
    queryKey: ['existing-services-categories'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/services', {
          params: { per_page: 1000 },
        });
        const services = response.data.data || [];
        const uniqueCategories = [...new Set(services.map(s => s.category).filter(Boolean))];
        return uniqueCategories.sort();
      } catch (error) {
        console.error('Error obteniendo categorías existentes:', error);
        return [];
      }
    },
    enabled: isAuthenticated && !!user && showServiceModal,
  });

  const client = clientData;
  const kardex = kardexData?.kardex || [];
  const summary = kardexData?.summary || {};

  // Verificar permisos
  const canEdit = client && isSuperAdmin();
  const canDelete = client && isSuperAdmin();

  // Mapear estados del backend al frontend
  const getMappedStatus = (status) => {
    const statusMap = {
      'active': 'activo',
      'inactive': 'inactivo',
      'prospect': 'prospecto',
      'lost': 'perdido',
    };
    return statusMap[status] || status;
  };

  const getWhatsAppUrl = (phone, message) => {
    const digits = String(phone || '').replace(/[^\d]/g, '');
    if (!digits) return null;
    const text = encodeURIComponent(message || '');
    return `https://wa.me/${digits}${text ? `?text=${text}` : ''}`;
  };

  // Service form states
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    customCategory: '',
    price: '',
    billing_type: 'monthly',
    standard_duration: '',
    start_date: '',
    end_date: '',
    contract_duration_months: '',
    contract_amount: '',
    payment_frequency: 'monthly',
    auto_renewal: false,
    billing_day: '',
    area_id: client?.area?.id?.toString() || '',
    assigned_to: '',
  });

  const [paymentFormData, setPaymentFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'transfer',
    invoice_number: '',
    notes: '',
  });

  const [renewalFormData, setRenewalFormData] = useState({
    new_end_date: '',
    renewal_amount: '',
    notes: '',
  });

  const [incidentFormData, setIncidentFormData] = useState({
    incident_date: new Date().toISOString().split('T')[0],
    description: '',
    severity: 'medium',
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(`/clients/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      toast.success('Cliente eliminado correctamente');
      navigate('/clients');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al eliminar cliente');
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/services', {
        ...data,
        client_id: parseInt(id),
        status: 'active',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-services', id]);
      queryClient.invalidateQueries(['client-kardex', id]);
      toast.success('Servicio creado correctamente');
      setShowServiceModal(false);
      setServiceFormData({
        name: '',
        code: '',
        description: '',
        category: '',
        customCategory: '',
        price: '',
        billing_type: 'monthly',
        standard_duration: '',
        start_date: '',
        end_date: '',
        contract_duration_months: '',
        contract_amount: '',
        payment_frequency: 'monthly',
        auto_renewal: false,
        billing_day: '',
        area_id: client?.area?.id?.toString() || '',
        assigned_to: '',
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear servicio');
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ serviceId, data }) => {
      const response = await apiClient.put(`/services/${serviceId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-services', id]);
      queryClient.invalidateQueries(['client-kardex', id]);
      toast.success('Servicio actualizado correctamente');
      setShowServiceModal(false);
      setSelectedService(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar servicio');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async ({ serviceId, data }) => {
      const response = await apiClient.post(`/services/${serviceId}/payment`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-services', id]);
      queryClient.invalidateQueries(['client-kardex', id]);
      toast.success('Pago registrado correctamente');
      setShowPaymentModal(false);
      setSelectedService(null);
      setPaymentFormData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'transfer',
        invoice_number: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al registrar pago');
    },
  });

  const renewalMutation = useMutation({
    mutationFn: async ({ serviceId, data }) => {
      const response = await apiClient.post(`/services/${serviceId}/renew`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-services', id]);
      queryClient.invalidateQueries(['client-kardex', id]);
      toast.success('Servicio renovado correctamente');
      setShowRenewalModal(false);
      setSelectedService(null);
      setRenewalFormData({
        new_end_date: '',
        renewal_amount: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al renovar servicio');
    },
  });

  const incidentMutation = useMutation({
    mutationFn: async ({ serviceId, data }) => {
      const response = await apiClient.post(`/services/${serviceId}/incident`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-services', id]);
      queryClient.invalidateQueries(['client-kardex', id]);
      toast.success('Incidencia registrada correctamente');
      setShowIncidentModal(false);
      setSelectedService(null);
      setIncidentFormData({
        incident_date: new Date().toISOString().split('T')[0],
        description: '',
        severity: 'medium',
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al registrar incidencia');
    },
  });

  // Obtener icono y color según tipo de entrada del kardex
  const getKardexIcon = (type) => {
    const icons = {
      'service_created': DocumentTextIcon,
      'service_renewal': CalendarIcon,
      'payment': CurrencyDollarIcon,
      'incident': ExclamationTriangleIcon,
    };
    return icons[type] || DocumentTextIcon;
  };

  const getKardexColor = (type) => {
    const colors = {
      'service_created': 'text-blue-500',
      'service_renewal': 'text-green-500',
      'payment': 'text-indigo-500',
      'incident': 'text-red-500',
    };
    return colors[type] || 'text-gray-500';
  };

  const getKardexLabel = (type) => {
    const labels = {
      'service_created': 'Servicio Creado',
      'service_renewal': 'Renovación',
      'payment': 'Pago',
      'incident': 'Incidencia',
    };
    return labels[type] || type;
  };

  // Loading state
  if (loadingClient) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loading />
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (clientError) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="danger">
            {clientError.response?.data?.message || 'Error al cargar el cliente'}
          </Alert>
          <Button variant="outline" onClick={() => navigate('/clients')}>
            Volver a Clientes
          </Button>
        </div>
      </AppLayout>
    );
  }

  // No client found
  if (!client) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Alert variant="warning">
            Cliente no encontrado
          </Alert>
          <Button variant="outline" onClick={() => navigate('/clients')}>
            Volver a Clientes
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
              onClick={() => navigate('/clients')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {client.business_name || client.full_name || client.legal_name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {client.document_number} • {client.client_type === 'company' ? 'Empresa' : 'Persona Natural'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={getStatusColor(getMappedStatus(client.status))}>
              {getStatusLabel(getMappedStatus(client.status))}
            </Badge>
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => navigate(`/clients/${id}/edit`)}
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
              onClick={() => setActiveTab('kardex')}
              className={`${
                activeTab === 'kardex'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Kardex
              {summary.total_services > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {summary.total_services}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'info' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card title="Información del Cliente">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        {client.client_type === 'company' ? 'Razón Social' : 'Nombre Completo'}
                      </label>
                      <p className="text-sm text-gray-900">{client.business_name || client.full_name}</p>
                    </div>
                    {client.legal_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Nombre Legal
                        </label>
                        <p className="text-sm text-gray-900">{client.legal_name}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Documento
                      </label>
                      <p className="text-sm text-gray-900">
                        {client.document_type?.toUpperCase()}: {client.document_number}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Tipo
                      </label>
                      <p className="text-sm text-gray-900">
                        {client.client_type === 'company' ? 'Empresa' : 'Persona Natural'}
                      </p>
                    </div>
                    {client.email && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Email
                        </label>
                        <p className="text-sm text-gray-900">{client.email}</p>
                      </div>
                    )}
                    {client.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Teléfono
                        </label>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-900">{client.phone}</p>
                          {getWhatsAppUrl(
                            client.phone,
                            `Hola ${client.business_name || client.full_name || client.legal_name || ''}, te escribo desde WorkCorp.`
                          ) && (
                            <a
                              href={getWhatsAppUrl(
                                client.phone,
                                `Hola ${client.business_name || client.full_name || client.legal_name || ''}, te escribo desde WorkCorp.`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-green-600 hover:text-green-700 font-medium"
                              onClick={(e) => {
                                // asegurar nueva pestaña incluso si el navegador bloquea window.open
                                e.stopPropagation();
                              }}
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                    {client.website && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Sitio Web
                        </label>
                        <p className="text-sm text-gray-900">
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-900">
                            {client.website}
                          </a>
                        </p>
                      </div>
                    )}
                    {client.industry && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Rubro/Industria
                        </label>
                        <p className="text-sm text-gray-900">{client.industry}</p>
                      </div>
                    )}
                    {client.company_size && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Tamaño
                        </label>
                        <p className="text-sm text-gray-900">
                          {client.company_size === 'small' ? 'Pequeña' :
                           client.company_size === 'medium' ? 'Mediana' : 'Grande'}
                        </p>
                      </div>
                    )}
                    {client.category && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Categoría
                        </label>
                        <Badge variant={client.category === 'A' ? 'success' : client.category === 'B' ? 'warning' : 'secondary'}>
                          Categoría {client.category}
                        </Badge>
                      </div>
                    )}
                    {client.source && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Origen
                        </label>
                        <p className="text-sm text-gray-900">
                          {client.source === 'referred' ? 'Referido' :
                           client.source === 'marketing' ? 'Marketing' : 'Venta Directa'}
                        </p>
                      </div>
                    )}
                    {client.registration_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Fecha de Registro
                        </label>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-gray-900">
                            {formatDate(client.registration_date)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {client.fiscal_address && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Dirección Fiscal
                      </label>
                      <p className="text-sm text-gray-900">{client.fiscal_address}</p>
                    </div>
                  )}
                  {client.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Notas
                      </label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{client.notes}</p>
                    </div>
                  )}
                </div>
              </Card>

              {client.contacts && client.contacts.length > 0 && (
                <Card title="Contactos">
                  <div className="space-y-3">
                    {client.contacts.map((contact) => (
                      <div key={contact.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                            {contact.position && (
                              <p className="text-xs text-gray-500">{contact.position}</p>
                            )}
                            {contact.email && (
                              <p className="text-xs text-gray-500">{contact.email}</p>
                            )}
                            {contact.phone && (
                              <p className="text-xs text-gray-500">{contact.phone}</p>
                            )}
                          </div>
                          {contact.is_primary && (
                            <Badge variant="success">Principal</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card title="Estado y Asignación">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estado:</span>
                    <Badge className={getStatusColor(getMappedStatus(client.status))}>
                      {getStatusLabel(getMappedStatus(client.status))}
                    </Badge>
                  </div>
                  {client.area && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Área:</span>
                      <span className="text-gray-900">{client.area.name}</span>
                    </div>
                  )}
                  {client.assigned_user && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ejecutivo:</span>
                      <span className="text-gray-900">{client.assigned_user.name}</span>
                    </div>
                  )}
                  {client.services_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Servicios:</span>
                      <span className="text-gray-900">{client.services_count}</span>
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Información Adicional">
                <div className="space-y-2 text-sm">
                  {client.created_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Creado:</span>
                      <span className="text-gray-900">
                        {formatDate(client.created_at)}
                      </span>
                    </div>
                  )}
                  {client.updated_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Actualizado:</span>
                      <span className="text-gray-900">
                        {formatDate(client.updated_at)}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        ) : activeTab === 'kardex' ? (
          <div className="space-y-6">
            {/* Header con botón para registrar servicio */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Kardex del Cliente</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Historial completo de servicios, pagos, renovaciones e incidencias
                </p>
              </div>
              {canEdit && (
                <Button
                  onClick={() => {
                    setSelectedService(null);
                    setShowServiceModal(true);
                  }}
                  icon={PlusIcon}
                >
                  Registrar Nuevo Servicio
                </Button>
              )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card padding={false}>
                <div className="p-4">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-8 w-8 text-blue-400" />
                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-500">Total Servicios</p>
                      <p className="text-lg font-semibold text-gray-900">{summary.total_services || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>
              <Card padding={false}>
                <div className="p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-500">Activos</p>
                      <p className="text-lg font-semibold text-gray-900">{summary.active_services || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>
              <Card padding={false}>
                <div className="p-4">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-8 w-8 text-indigo-400" />
                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-500">Total Pagos</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(summary.total_payments || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
              <Card padding={false}>
                <div className="p-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-8 w-8 text-green-400" />
                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-500">Renovaciones</p>
                      <p className="text-lg font-semibold text-gray-900">{summary.total_renewals || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>
              <Card padding={false}>
                <div className="p-4">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-500">Incidencias</p>
                      <p className="text-lg font-semibold text-gray-900">{summary.total_incidents || 0}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Kardex Timeline */}
            <Card title="Historial Completo (Kardex)">
              {loadingKardex ? (
                <div className="flex items-center justify-center py-12">
                  <Loading />
                </div>
              ) : kardex.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No hay registros en el kardex</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {kardex.map((entry, index) => {
                    const Icon = getKardexIcon(entry.type);
                    const iconColor = getKardexColor(entry.type);
                    return (
                      <div key={index} className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0">
                        <div className={`flex-shrink-0 ${iconColor}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {getKardexLabel(entry.type)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
                              {entry.service && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Servicio: {entry.service.name}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {entry.date && (
                                <p className="text-xs text-gray-500">
                                  {formatDate(entry.date)}
                                </p>
                              )}
                              {entry.amount && (
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                  {formatCurrency(entry.amount)}
                                </p>
                              )}
                            </div>
                          </div>
                          {entry.payment_method && (
                            <p className="text-xs text-gray-500 mt-1">
                              Método: {entry.payment_method}
                            </p>
                          )}
                          {entry.invoice_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              Factura: {entry.invoice_number}
                            </p>
                          )}
                          {entry.received_by && (
                            <p className="text-xs text-gray-500 mt-1">
                              Recibido por: {entry.received_by.name}
                            </p>
                          )}
                          {entry.incident && (
                            <div className="mt-2 p-2 bg-red-50 rounded">
                              <p className="text-xs font-medium text-red-900">
                                Tipo: {entry.incident.type} • Estado: {entry.incident.status}
                              </p>
                              {entry.incident.description && (
                                <p className="text-xs text-red-700 mt-1">{entry.incident.description}</p>
                              )}
                            </div>
                          )}
                          {entry.renewal && entry.renewal.notes && (
                            <p className="text-xs text-gray-500 mt-1">
                              Notas: {entry.renewal.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        ) : activeTab === 'services' ? (
          <div className="space-y-6">
            {/* Services Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Servicios del Cliente</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Gestiona los servicios contratados por {client.business_name || client.full_name}
                </p>
              </div>
              {canEdit && (
                <Button
                  onClick={() => {
                    setSelectedService(null);
                    setShowServiceModal(true);
                  }}
                  icon={PlusIcon}
                >
                  Nuevo Servicio
                </Button>
              )}
            </div>

            {/* Services List */}
            {loadingServices ? (
              <div className="flex items-center justify-center py-12">
                <Loading />
              </div>
            ) : !servicesData || servicesData.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay servicios</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comienza registrando el primer servicio para este cliente
                  </p>
                  {canEdit && (
                    <div className="mt-6">
                      <Button
                        onClick={() => {
                          setSelectedService(null);
                          setShowServiceModal(true);
                        }}
                        icon={PlusIcon}
                      >
                        Nuevo Servicio
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {servicesData.map((service) => (
                  <Card key={service.id} padding={false}>
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                            <Badge className={getStatusColor(service.status)}>
                              {getStatusLabel(service.status)}
                            </Badge>
                            {service.is_expiring && (
                              <Badge variant="warning">Por Vencer</Badge>
                            )}
                            {service.is_expired && (
                              <Badge variant="danger">Vencido</Badge>
                            )}
                          </div>
                          {service.description && (
                            <p className="mt-2 text-sm text-gray-600">{service.description}</p>
                          )}
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Monto:</span>
                              <p className="font-semibold text-gray-900">
                                {formatCurrency(service.contract_amount || 0)}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Inicio:</span>
                              <p className="font-medium text-gray-900">
                                {service.start_date ? formatDate(service.start_date) : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Vencimiento:</span>
                              <p className="font-medium text-gray-900">
                                {service.end_date ? formatDate(service.end_date) : '-'}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-500">Frecuencia:</span>
                              <p className="font-medium text-gray-900">
                                {service.payment_frequency === 'monthly' ? 'Mensual' :
                                 service.payment_frequency === 'quarterly' ? 'Trimestral' :
                                 service.payment_frequency === 'annual' ? 'Anual' : 'Único'}
                              </p>
                            </div>
                          </div>
                          {service.assigned_user && (
                            <div className="mt-3 text-sm">
                              <span className="text-gray-500">Responsable: </span>
                              <span className="text-gray-900">{service.assigned_user.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          {canEdit && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedService(service);
                                  setShowServiceModal(true);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedService(service);
                                  setShowPaymentModal(true);
                                }}
                              >
                                Registrar Pago
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedService(service);
                                  setShowRenewalModal(true);
                                }}
                              >
                                Renovar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedService(service);
                                  setShowIncidentModal(true);
                                }}
                              >
                                Reportar Incidencia
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Service Modal */}
        <Modal
          open={showServiceModal}
          onClose={() => {
            setShowServiceModal(false);
            setSelectedService(null);
            setServiceFormData({
              name: '',
              code: '',
              description: '',
              category: '',
              customCategory: '',
              price: '',
              billing_type: 'monthly',
              standard_duration: '',
              start_date: '',
              end_date: '',
              contract_duration_months: '',
              contract_amount: '',
              payment_frequency: 'monthly',
              auto_renewal: false,
              billing_day: '',
              area_id: client?.area?.id?.toString() || '',
              assigned_to: '',
            });
          }}
          title={selectedService ? 'Editar Servicio' : 'Registrar Nuevo Servicio'}
          size="lg"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowServiceModal(false);
                  setSelectedService(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!serviceFormData.name || serviceFormData.name.trim() === '') {
                    toast.error('El nombre del servicio es requerido');
                    return;
                  }

                  // Si se seleccionó "Crear nueva categoría", usar el customCategory
                  const serviceCategory = serviceFormData.category === '__custom__'
                    ? serviceFormData.customCategory
                    : serviceFormData.category;

                  const submitData = {
                    ...serviceFormData,
                    name: serviceFormData.name.trim(),
                    category: serviceCategory,
                    price: serviceFormData.price ? parseFloat(serviceFormData.price) : null,
                    standard_duration: serviceFormData.standard_duration ? parseInt(serviceFormData.standard_duration) : null,
                    contract_duration_months: serviceFormData.contract_duration_months ? parseInt(serviceFormData.contract_duration_months) : null,
                    contract_amount: parseFloat(serviceFormData.contract_amount),
                    billing_day: serviceFormData.billing_day ? parseInt(serviceFormData.billing_day) : null,
                    area_id: serviceFormData.area_id ? parseInt(serviceFormData.area_id) : null,
                    assigned_to: serviceFormData.assigned_to ? parseInt(serviceFormData.assigned_to) : null,
                  };

                  // Eliminar campos que no se deben enviar
                  delete submitData.customCategory;

                  // Limpiar campos vacíos
                  Object.keys(submitData).forEach(key => {
                    if (submitData[key] === '' || submitData[key] === null || submitData[key] === undefined) {
                      delete submitData[key];
                    }
                  });

                  if (selectedService) {
                    updateServiceMutation.mutate({
                      serviceId: selectedService.id,
                      data: submitData,
                    });
                  } else {
                    createServiceMutation.mutate(submitData);
                  }
                }}
                loading={createServiceMutation.isPending || updateServiceMutation.isPending}
              >
                {selectedService ? 'Actualizar' : 'Registrar Servicio'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre del Servicio *"
                value={serviceFormData.name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                required
                placeholder="Ingresa el nombre del servicio"
              />
              <Input
                label="Código/SKU"
                value={serviceFormData.code}
                onChange={(e) => setServiceFormData({ ...serviceFormData, code: e.target.value })}
                placeholder="Código único del servicio"
              />
            </div>
            <Textarea
              label="Descripción"
              value={serviceFormData.description}
              onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
              rows={3}
              placeholder="Descripción detallada del servicio"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Categoría"
                  value={serviceFormData.category}
                  onChange={(e) => {
                    const selectedCategory = e.target.value;
                    setServiceFormData({
                      ...serviceFormData,
                      category: selectedCategory,
                      customCategory: selectedCategory === '__custom__' ? serviceFormData.customCategory : '',
                    });
                  }}
                  options={[
                    { value: '', label: 'Seleccionar categoría...' },
                    ...(existingCategoriesData?.map(category => ({
                      value: category,
                      label: category,
                    })) || []),
                    { value: '__custom__', label: '➕ Crear nueva categoría' },
                  ]}
                />
                {serviceFormData.category === '__custom__' && (
                  <div className="mt-2">
                    <Input
                      label="Nueva Categoría *"
                      value={serviceFormData.customCategory || ''}
                      onChange={(e) => {
                        setServiceFormData({
                          ...serviceFormData,
                          customCategory: e.target.value,
                          category: e.target.value,
                        });
                      }}
                      required
                      placeholder="Ingresa el nombre de la nueva categoría"
                    />
                  </div>
                )}
              </div>
              <Input
                label="Precio Unitario"
                type="number"
                step="0.01"
                value={serviceFormData.price}
                onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tipo de Facturación *"
                value={serviceFormData.billing_type}
                onChange={(e) => setServiceFormData({ ...serviceFormData, billing_type: e.target.value })}
                options={[
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'annual', label: 'Anual' },
                  { value: 'project', label: 'Por Proyecto' },
                  { value: 'hourly', label: 'Por Hora' },
                ]}
              />
              <Input
                label="Duración Estándar (horas/días)"
                type="number"
                value={serviceFormData.standard_duration}
                onChange={(e) => setServiceFormData({ ...serviceFormData, standard_duration: e.target.value })}
                placeholder="Ej: 40 horas, 30 días"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha de Inicio *"
                type="date"
                value={serviceFormData.start_date}
                onChange={(e) => setServiceFormData({ ...serviceFormData, start_date: e.target.value })}
                required
              />
              <Input
                label="Fecha de Vencimiento *"
                type="date"
                value={serviceFormData.end_date}
                onChange={(e) => setServiceFormData({ ...serviceFormData, end_date: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Duración del Contrato (meses)"
                type="number"
                value={serviceFormData.contract_duration_months}
                onChange={(e) => setServiceFormData({ ...serviceFormData, contract_duration_months: e.target.value })}
                placeholder="Ej: 12, 24, 36"
              />
              <Input
                label="Monto del Contrato *"
                type="number"
                step="0.01"
                value={serviceFormData.contract_amount}
                onChange={(e) => setServiceFormData({ ...serviceFormData, contract_amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Frecuencia de Pago *"
                value={serviceFormData.payment_frequency}
                onChange={(e) => setServiceFormData({ ...serviceFormData, payment_frequency: e.target.value })}
                options={[
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'quarterly', label: 'Trimestral' },
                  { value: 'annual', label: 'Anual' },
                  { value: 'one_time', label: 'Único' },
                ]}
              />
              <Input
                label="Día de Facturación (1-31)"
                type="number"
                min="1"
                max="31"
                value={serviceFormData.billing_day}
                onChange={(e) => setServiceFormData({ ...serviceFormData, billing_day: e.target.value })}
                placeholder="Día del mes"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Área Responsable"
                value={serviceFormData.area_id}
                onChange={(e) => setServiceFormData({ ...serviceFormData, area_id: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar área' },
                  ...(areasData?.map(area => ({
                    value: area.id.toString(),
                    label: area.name,
                  })) || []),
                ]}
              />
              <Select
                label="Responsable Asignado"
                value={serviceFormData.assigned_to}
                onChange={(e) => setServiceFormData({ ...serviceFormData, assigned_to: e.target.value })}
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...(usersData?.map(user => ({
                    value: user.id.toString(),
                    label: `${user.name} (${user.email})`,
                  })) || []),
                ]}
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="auto_renewal"
                checked={serviceFormData.auto_renewal}
                onChange={(e) => setServiceFormData({ ...serviceFormData, auto_renewal: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="auto_renewal" className="ml-2 block text-sm text-gray-900">
                Renovación Automática
              </label>
            </div>
          </div>
        </Modal>

        {/* Payment Modal */}
        <Modal
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedService(null);
            setPaymentFormData({
              payment_date: new Date().toISOString().split('T')[0],
              amount: '',
              payment_method: 'transfer',
              invoice_number: '',
              notes: '',
            });
          }}
          title="Registrar Pago"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedService(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedService) {
                    paymentMutation.mutate({
                      serviceId: selectedService.id,
                      data: {
                        ...paymentFormData,
                        amount: parseFloat(paymentFormData.amount),
                      },
                    });
                  }
                }}
                loading={paymentMutation.isPending}
              >
                Registrar Pago
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {selectedService && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-900">Servicio: {selectedService.name}</p>
                <p className="text-xs text-gray-500">Monto del contrato: {formatCurrency(selectedService.contract_amount || 0)}</p>
              </div>
            )}
            <Input
              label="Fecha de Pago *"
              type="date"
              value={paymentFormData.payment_date}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
              required
            />
            <Input
              label="Monto *"
              type="number"
              step="0.01"
              value={paymentFormData.amount}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
              required
            />
            <Select
              label="Método de Pago *"
              value={paymentFormData.payment_method}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
              options={[
                { value: 'cash', label: 'Efectivo' },
                { value: 'transfer', label: 'Transferencia' },
                { value: 'card', label: 'Tarjeta' },
                { value: 'check', label: 'Cheque' },
              ]}
            />
            <Input
              label="Número de Factura"
              value={paymentFormData.invoice_number}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, invoice_number: e.target.value })}
            />
            <Textarea
              label="Notas"
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </Modal>

        {/* Renewal Modal */}
        <Modal
          open={showRenewalModal}
          onClose={() => {
            setShowRenewalModal(false);
            setSelectedService(null);
            setRenewalFormData({
              new_end_date: '',
              renewal_amount: '',
              notes: '',
            });
          }}
          title="Renovar Servicio"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRenewalModal(false);
                  setSelectedService(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedService) {
                    renewalMutation.mutate({
                      serviceId: selectedService.id,
                      data: {
                        ...renewalFormData,
                        renewal_amount: renewalFormData.renewal_amount ? parseFloat(renewalFormData.renewal_amount) : null,
                      },
                    });
                  }
                }}
                loading={renewalMutation.isPending}
              >
                Renovar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {selectedService && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-900">Servicio: {selectedService.name}</p>
                <p className="text-xs text-gray-500">
                  Vencimiento actual: {selectedService.end_date ? formatDate(selectedService.end_date) : '-'}
                </p>
              </div>
            )}
            <Input
              label="Nueva Fecha de Vencimiento *"
              type="date"
              value={renewalFormData.new_end_date}
              onChange={(e) => setRenewalFormData({ ...renewalFormData, new_end_date: e.target.value })}
              required
            />
            <Input
              label="Monto de Renovación"
              type="number"
              step="0.01"
              value={renewalFormData.renewal_amount}
              onChange={(e) => setRenewalFormData({ ...renewalFormData, renewal_amount: e.target.value })}
              placeholder={selectedService?.contract_amount ? formatCurrency(selectedService.contract_amount) : ''}
            />
            <Textarea
              label="Notas"
              value={renewalFormData.notes}
              onChange={(e) => setRenewalFormData({ ...renewalFormData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </Modal>

        {/* Incident Modal */}
        <Modal
          open={showIncidentModal}
          onClose={() => {
            setShowIncidentModal(false);
            setSelectedService(null);
            setIncidentFormData({
              incident_date: new Date().toISOString().split('T')[0],
              description: '',
              severity: 'medium',
            });
          }}
          title="Reportar Incidencia"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowIncidentModal(false);
                  setSelectedService(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedService) {
                    incidentMutation.mutate({
                      serviceId: selectedService.id,
                      data: incidentFormData,
                    });
                  }
                }}
                loading={incidentMutation.isPending}
              >
                Reportar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {selectedService && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-900">Servicio: {selectedService.name}</p>
              </div>
            )}
            <Input
              label="Fecha de la Incidencia *"
              type="date"
              value={incidentFormData.incident_date}
              onChange={(e) => setIncidentFormData({ ...incidentFormData, incident_date: e.target.value })}
              required
            />
            <Select
              label="Severidad *"
              value={incidentFormData.severity}
              onChange={(e) => setIncidentFormData({ ...incidentFormData, severity: e.target.value })}
              options={[
                { value: 'low', label: 'Baja' },
                { value: 'medium', label: 'Media' },
                { value: 'high', label: 'Alta' },
                { value: 'critical', label: 'Crítica' },
              ]}
            />
            <Textarea
              label="Descripción *"
              value={incidentFormData.description}
              onChange={(e) => setIncidentFormData({ ...incidentFormData, description: e.target.value })}
              rows={4}
              required
              placeholder="Describe la incidencia en detalle..."
            />
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Eliminar Cliente"
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
              ¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.
            </Alert>
            <p className="text-sm text-gray-600">
              El cliente <strong>{client.business_name || client.full_name}</strong> será eliminado permanentemente.
            </p>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}

