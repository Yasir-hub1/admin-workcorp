import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const initialTab = (() => {
    const tab = (searchParams.get('tab') || '').toLowerCase();
    if (tab === 'kardex') return 'kardex';
    return 'info';
  })();
  const [activeTab, setActiveTab] = useState(initialTab); // 'info' o 'kardex'
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
    enabled: !!id && isAuthenticated && !!user && activeTab === 'kardex' && !!clientData && (isSuperAdmin() || hasPermission('clients.kardex.view') || hasPermission('clients.kardex')),
  });

  const clientServices = useMemo(() => {
    return kardexData?.client_services || [];
  }, [kardexData]);

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


  // Servicios del catálogo (para agregar al kardex)
  const { data: catalogServicesData } = useQuery({
    queryKey: ['services-catalog-for-kardex'],
    queryFn: async () => {
      const response = await apiClient.get('/services', { params: { per_page: 1000 } });
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user && showServiceModal,
  });

  const client = clientData;
  const kardex = kardexData?.kardex || [];
  const summary = kardexData?.summary || {};

  // Verificar permisos
  const canViewKardex = client && (isSuperAdmin() || hasPermission('clients.kardex.view') || hasPermission('clients.kardex'));
  const canCreateKardex = client && (isSuperAdmin() || hasPermission('clients.kardex.create'));
  // Importante: "Servicios" es catálogo independiente. Aquí solo gestionamos Kardex (servicios adquiridos).
  const canEdit = client && (isSuperAdmin() || hasPermission('clients.edit')); // cliente
  const canDelete = client && (isSuperAdmin() || hasPermission('clients.delete'));

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

  // Kardex: registrar servicio adquirido (selecciona servicio del catálogo + datos de contrato)
  const [serviceFormData, setServiceFormData] = useState({
    service_id: '',
    start_date: '',
    end_date: '',
    contract_duration_months: '',
    contract_amount: '',
    payment_frequency: 'monthly',
    auto_renewal: false,
    billing_day: '',
    area_id: client?.area?.id?.toString() || '',
    assigned_to: '',
    notes: '',
  });

  // Inicializar formulario cuando se abre el modal de Kardex
  useEffect(() => {
    if (!showServiceModal) return;

    setServiceFormData({
      service_id: '',
      start_date: '',
      end_date: '',
      contract_duration_months: '',
      contract_amount: '',
      payment_frequency: 'monthly',
      auto_renewal: false,
      billing_day: '',
      area_id: client?.area?.id?.toString() || '',
      assigned_to: '',
      notes: '',
    });
  }, [showServiceModal, client?.area?.id]);

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

  // Agregar servicio del catálogo al Kardex del cliente
  const createServiceMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post(`/clients/${id}/kardex/services`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['client-kardex', id]);
      toast.success('Servicio creado correctamente');
      setShowServiceModal(false);
      setServiceFormData({
        service_id: '',
        start_date: '',
        end_date: '',
        contract_duration_months: '',
        contract_amount: '',
        payment_frequency: 'monthly',
        auto_renewal: false,
        billing_day: '',
        area_id: client?.area?.id?.toString() || '',
        assigned_to: '',
        notes: '',
      });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear servicio');
    },
  });

  // Nota: edición del catálogo se hace en /services, no desde cliente.

  const paymentMutation = useMutation({
    mutationFn: async ({ serviceId, data }) => {
      const response = await apiClient.post(`/client-services/${serviceId}/payment`, data);
      return response.data;
    },
    onSuccess: () => {
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
      const response = await apiClient.post(`/client-services/${serviceId}/renew`, data);
      return response.data;
    },
    onSuccess: () => {
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
      const response = await apiClient.post(`/client-services/${serviceId}/incident`, data);
      return response.data;
    },
    onSuccess: () => {
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
            {canViewKardex && (
              <button
                onClick={() => setActiveTab('kardex')}
                className={`${
                  activeTab === 'kardex'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Kardex
                {(summary?.total_services || 0) > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {summary.total_services}
                  </span>
                )}
              </button>
            )}
            {/* Servicios del cliente se gestionan vía Kardex (servicios adquiridos) */}
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
            {/* Header con botón para agregar servicio adquirido (Kardex) */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Kardex del Cliente</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Historial completo de servicios, pagos, renovaciones e incidencias
                </p>
              </div>
              {canCreateKardex && (
                <Button
                  onClick={() => {
                    setShowServiceModal(true);
                  }}
                  icon={PlusIcon}
                >
                  Agregar servicio (Kardex)
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
                      <p className="text-xs font-medium text-gray-500">Estado</p>
                      <p className="text-lg font-semibold text-gray-900">{summary.active_services || 0} activos</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                          {summary.expiring_services || 0} por vencer
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200">
                          {summary.expired_services || 0} vencidos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              <Card padding={false}>
                <div className="p-4">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-8 w-8 text-indigo-400" />
                    <div className="ml-4">
                      <p className="text-xs font-medium text-gray-500">Cobros</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(summary.total_payments || 0)}
                      </p>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Contratos: <span className="font-semibold text-gray-700">{formatCurrency(summary.total_contract_amount || 0)}</span>
                      </div>
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
                    const service = entry.service || null;
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
                              {service?.name && (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-gray-700">
                                    Servicio: <span className="font-semibold">{service.name}</span>
                                  </span>
                                  {service.status && (
                                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${getStatusColor(service.status)}`}>
                                      {getStatusLabel(service.status)}
                                    </span>
                                  )}
                                  {service.assigned_user?.name && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                      Resp: {service.assigned_user.name}
                                    </span>
                                  )}
                                  {service.area?.name && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                      Área: {service.area.name}
                                    </span>
                                  )}
                                </div>
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
                          {(service?.start_date || service?.end_date || service?.payment_frequency || service?.contract_amount) && (
                            <div className="mt-2 text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                              {(service.start_date || service.end_date) && (
                                <span className="font-mono">
                                  {service.start_date || '—'} → {service.end_date || '—'}
                                </span>
                              )}
                              {service.payment_frequency && (
                                <span>Frecuencia: <span className="font-semibold">{service.payment_frequency}</span></span>
                              )}
                              {service.contract_amount !== null && service.contract_amount !== undefined && (
                                <span>Contrato: <span className="font-semibold">{formatCurrency(service.contract_amount)}</span></span>
                              )}
                            </div>
                          )}
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

            {/* Servicios adquiridos */}
            <Card title={`Servicios adquiridos (${clientServices.length})`}>
              {clientServices.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Este cliente aún no tiene servicios adquiridos.</div>
              ) : (
                <div className="space-y-3">
                  {clientServices.map((cs) => (
                    <div key={cs.id} className="p-4 rounded-lg border border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {cs.service?.name || 'Servicio'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {cs.start_date || '—'} → {cs.end_date || '—'}
                          {cs.contract_amount !== null && cs.contract_amount !== undefined ? ` • ${formatCurrency(cs.contract_amount)}` : ''}
                          {cs.payment_frequency ? ` • ${cs.payment_frequency}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getStatusColor(cs.status)}>{getStatusLabel(cs.status)}</Badge>
                        {canCreateKardex && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedService(cs); // cs = client_service
                                setShowPaymentModal(true);
                              }}
                            >
                              Registrar Pago
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedService(cs);
                                setShowRenewalModal(true);
                              }}
                            >
                              Renovar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedService(cs);
                                setShowIncidentModal(true);
                              }}
                            >
                              Incidencia
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : null}

        {/* Kardex: Agregar servicio del catálogo */}
        <Modal
          open={showServiceModal}
          onClose={() => {
            setShowServiceModal(false);
            setServiceFormData({
              service_id: '',
              start_date: '',
              end_date: '',
              contract_duration_months: '',
              contract_amount: '',
              payment_frequency: 'monthly',
              auto_renewal: false,
              billing_day: '',
              area_id: client?.area?.id?.toString() || '',
              assigned_to: '',
              notes: '',
            });
          }}
          title="Agregar servicio al Kardex"
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setShowServiceModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!serviceFormData.service_id) {
                    toast.error('Selecciona un servicio del catálogo');
                    return;
                  }

                  const submitData = {
                    service_id: parseInt(serviceFormData.service_id),
                    start_date: serviceFormData.start_date || null,
                    end_date: serviceFormData.end_date || null,
                    contract_duration_months: serviceFormData.contract_duration_months ? parseInt(serviceFormData.contract_duration_months) : null,
                    contract_amount: serviceFormData.contract_amount ? parseFloat(serviceFormData.contract_amount) : null,
                    payment_frequency: serviceFormData.payment_frequency || 'monthly',
                    auto_renewal: !!serviceFormData.auto_renewal,
                    billing_day: serviceFormData.billing_day ? parseInt(serviceFormData.billing_day) : null,
                    area_id: serviceFormData.area_id ? parseInt(serviceFormData.area_id) : null,
                    assigned_to: serviceFormData.assigned_to ? parseInt(serviceFormData.assigned_to) : null,
                    notes: serviceFormData.notes || null,
                  };

                  Object.keys(submitData).forEach((k) => {
                    if (submitData[k] === null || submitData[k] === '' || submitData[k] === undefined) {
                      delete submitData[k];
                    }
                  });

                  createServiceMutation.mutate(submitData);
                }}
                loading={createServiceMutation.isPending}
              >
                Agregar
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Servicio del catálogo *"
              value={serviceFormData.service_id}
              onChange={(e) => setServiceFormData({ ...serviceFormData, service_id: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar servicio…' },
                ...(catalogServicesData || []).map((s) => ({
                  value: String(s.id),
                  label: `${s.name}${s.category ? ` • ${s.category}` : ''}${s.code ? ` • ${s.code}` : ''}`,
                })),
              ]}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha de Inicio"
                type="date"
                value={serviceFormData.start_date}
                onChange={(e) => setServiceFormData({ ...serviceFormData, start_date: e.target.value })}
              />
              <Input
                label="Fecha de Vencimiento"
                type="date"
                value={serviceFormData.end_date}
                onChange={(e) => setServiceFormData({ ...serviceFormData, end_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Monto del Contrato"
                type="number"
                step="0.01"
                value={serviceFormData.contract_amount}
                onChange={(e) => setServiceFormData({ ...serviceFormData, contract_amount: e.target.value })}
                placeholder="0.00"
              />
              <Select
                label="Frecuencia de Pago"
                value={serviceFormData.payment_frequency}
                onChange={(e) => setServiceFormData({ ...serviceFormData, payment_frequency: e.target.value })}
                options={[
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'quarterly', label: 'Trimestral' },
                  { value: 'annual', label: 'Anual' },
                  { value: 'one_time', label: 'Único' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Área Responsable"
                value={serviceFormData.area_id}
                onChange={(e) => setServiceFormData({ ...serviceFormData, area_id: e.target.value })}
                options={[
                  { value: '', label: 'Seleccionar área' },
                  ...(areasData?.map((a) => ({ value: String(a.id), label: a.name })) || []),
                ]}
              />
              <Select
                label="Responsable Asignado"
                value={serviceFormData.assigned_to}
                onChange={(e) => setServiceFormData({ ...serviceFormData, assigned_to: e.target.value })}
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...(usersData?.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` })) || []),
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Día de Facturación (1-31)"
                type="number"
                min="1"
                max="31"
                value={serviceFormData.billing_day}
                onChange={(e) => setServiceFormData({ ...serviceFormData, billing_day: e.target.value })}
              />
              <div className="flex items-center gap-2 pt-7">
                <input
                  type="checkbox"
                  id="auto_renewal"
                  checked={serviceFormData.auto_renewal}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, auto_renewal: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_renewal" className="text-sm text-gray-900">
                  Renovación automática
                </label>
              </div>
            </div>

            <Textarea
              label="Notas"
              value={serviceFormData.notes}
              onChange={(e) => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
              rows={3}
              placeholder="Opcional…"
            />
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
                <p className="text-sm font-medium text-gray-900">Servicio: {selectedService.service?.name || 'Servicio'}</p>
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
                <p className="text-sm font-medium text-gray-900">Servicio: {selectedService.service?.name || 'Servicio'}</p>
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
                <p className="text-sm font-medium text-gray-900">Servicio: {selectedService.service?.name || 'Servicio'}</p>
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

