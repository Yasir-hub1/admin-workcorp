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
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateTicketPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: '',
    status: 'open',
    client_id: '',
    assigned_to: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Obtener ticket si está en modo edición
  const { data: ticketData, isLoading: loadingTicket } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener clientes
  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-tickets'],
    queryFn: async () => {
      const response = await apiClient.get('/clients', { params: { per_page: 200 } });
      return response.data?.data || [];
    },
    enabled: isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener usuarios para asignación
  const { data: usersData } = useQuery({
    queryKey: ['users-for-tickets'],
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
  });

  // Obtener categorías (buscador)
  const { data: categoriesData } = useQuery({
    queryKey: ['ticket-categories', categorySearch],
    queryFn: async () => {
      const response = await apiClient.get('/tickets/categories', { params: { search: categorySearch } });
      return response.data?.data || [];
    },
    enabled: isAuthenticated && !!user && categorySearch.trim().length > 0,
    retry: 1,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (name) => {
      const response = await apiClient.post('/tickets/categories', { name });
      return response.data?.data;
    },
    onSuccess: (created) => {
      if (created?.name) {
        setFormData((prev) => ({ ...prev, category: created.name }));
        setCategorySearch(created.name);
        setShowCategoryDropdown(false);
        toast.success('Categoría creada');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear categoría');
    },
  });

  // Inicializar formulario con datos del ticket
  useEffect(() => {
    if (isEditMode && ticketData && !isFormInitialized) {
      setFormData({
        title: ticketData.title || '',
        description: ticketData.description || '',
        category: ticketData.category || '',
        priority: ticketData.priority || '',
        status: ticketData.status || 'open',
        client_id: ticketData.client_id || '',
        assigned_to: ticketData.assigned_to_id || '',
      });
      setCategorySearch(ticketData.category || '');
      setIsFormInitialized(true);
    }
  }, [ticketData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/tickets', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['tickets']);
      toast.success('Ticket creado correctamente');
      navigate(`/tickets/${data.data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear ticket');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/tickets/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['ticket', id]);
      toast.success('Ticket actualizado correctamente');
      navigate(`/tickets/${id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar ticket');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (isEditMode && loadingTicket) {
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
              onClick={() => navigate('/tickets')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Ticket' : 'Nuevo Ticket de Soporte'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del ticket' : 'Crea un nuevo ticket de soporte técnico'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isEditMode && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Input
                      label="Buscar cliente"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Ej: Empresa, NIT, correo..."
                    />
                    <Select
                      label="Cliente"
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      required
                      placeholder="Selecciona un cliente"
                      options={(clientsData || [])
                        .filter((c) => {
                          if (!clientSearch.trim()) return true;
                          const q = clientSearch.trim().toLowerCase();
                          return (
                            (c.business_name || '').toLowerCase().includes(q) ||
                            (c.legal_name || '').toLowerCase().includes(q) ||
                            (c.document_number || '').toLowerCase().includes(q) ||
                            (c.email || '').toLowerCase().includes(q)
                          );
                        })
                        .slice(0, 200)
                        .map((c) => ({
                          value: String(c.id),
                          label: `${c.business_name || c.legal_name || 'Cliente'}${c.document_number ? ` (${c.document_number})` : ''}`,
                        }))}
                    />
                  </div>

                  <Select
                    label="Soporte asignado"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    required
                    placeholder="Selecciona un soporte"
                    options={(usersData || []).map((u) => ({
                      value: String(u.id),
                      label: `${u.name}${u.email ? ` (${u.email})` : ''}`,
                    }))}
                  />
                </div>
              </>
            )}

            <Input
              label="Título"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ej: Problema con el sistema de facturación"
            />

            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              required
              placeholder="Describe el problema o solicitud en detalle..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  label="Categoría"
                  value={categorySearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCategorySearch(value);
                    setFormData((prev) => ({ ...prev, category: value }));
                    setShowCategoryDropdown(true);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onBlur={() => {
                    // pequeño delay para permitir click en dropdown
                    setTimeout(() => setShowCategoryDropdown(false), 150);
                  }}
                  required
                  placeholder="Escribe para buscar o crear..."
                  helperText="Tip: escribe y selecciona una existente para evitar duplicados; si no existe, puedes crearla."
                />

                {showCategoryDropdown && categorySearch.trim().length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto">
                    {(categoriesData || []).length > 0 ? (
                      (categoriesData || []).map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, category: cat.name }));
                            setCategorySearch(cat.name);
                            setShowCategoryDropdown(false);
                          }}
                        >
                          {cat.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                    )}

                    {(() => {
                      const q = categorySearch.trim();
                      const exactExists = (categoriesData || []).some(
                        (c) => (c.name || '').trim().toLowerCase() === q.toLowerCase()
                      );
                      if (!q || exactExists) return null;
                      return (
                        <div className="border-t border-gray-100 p-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="w-full justify-center"
                            loading={createCategoryMutation.isPending}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => createCategoryMutation.mutate(q)}
                          >
                            Crear categoría: "{q}"
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <Select
                label="Prioridad"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                required
                options={[
                  { value: 'low', label: 'Baja' },
                  { value: 'medium', label: 'Media' },
                  { value: 'high', label: 'Alta' },
                  { value: 'urgent', label: 'Urgente' },
                ]}
              />
            </div>

            {isEditMode && (
              <Select
                label="Estado"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'open', label: 'Abierto' },
                  { value: 'assigned', label: 'Asignado' },
                  { value: 'in_progress', label: 'En Progreso' },
                  { value: 'resolved', label: 'Resuelto' },
                  { value: 'closed', label: 'Cerrado' },
                ]}
              />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tickets')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar Ticket' : 'Crear Ticket'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

