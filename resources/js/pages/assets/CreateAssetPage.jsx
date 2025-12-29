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
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateAssetPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    serial_number: '',
    category: '',
    brand: '',
    model: '',
    description: '',
    acquisition_cost: '',
    purchase_date: '',
    supplier: '',
    invoice_number: '',
    purchase_order: '',
    payment_method: '',
    useful_life_years: '',
    status: 'available',
    area_id: '',
    location: '',
    assigned_to: '',
    warranty_start_date: '',
    warranty_end_date: '',
    warranty_terms: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Función para generar código automáticamente
  const generateCode = async () => {
    if (isEditMode) return; // No generar en modo edición
    
    try {
      const params = {};
      if (formData.area_id) params.area_id = formData.area_id;
      if (formData.category) params.category = formData.category;
      
      const response = await apiClient.get('/assets/generate-code', { params });
      if (response.data.success && response.data.data.code) {
        setFormData(prev => ({
          ...prev,
          code: response.data.data.code,
        }));
      }
    } catch (error) {
      console.error('Error generando código:', error);
    }
  };

  // Generar código cuando cambia el área o categoría
  useEffect(() => {
    if (!isEditMode && !formData.code && (formData.area_id || formData.category)) {
      generateCode();
    }
  }, [formData.area_id, formData.category]);

  // Generar código inicial al cargar el formulario (solo en creación)
  useEffect(() => {
    if (!isEditMode && !formData.code) {
      generateCode();
    }
  }, []);

  // Obtener activo si está en modo edición
  const { data: assetData, isLoading: loadingAsset } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await apiClient.get(`/assets/${id}`);
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
    queryKey: ['users-for-assets'],
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

  // Inicializar formulario con datos del activo
  useEffect(() => {
    if (isEditMode && assetData && !isFormInitialized) {
      setFormData({
        name: assetData.name || '',
        code: assetData.code || '',
        serial_number: assetData.serial_number || '',
        category: assetData.category || '',
        brand: assetData.brand || '',
        model: assetData.model || '',
        description: assetData.description || '',
        acquisition_cost: assetData.acquisition_cost?.toString() || '',
        purchase_date: assetData.purchase_date || '',
        supplier: assetData.supplier || '',
        invoice_number: assetData.invoice_number || '',
        purchase_order: assetData.purchase_order || '',
        payment_method: assetData.payment_method || '',
        useful_life_years: assetData.useful_life_years?.toString() || '',
        status: assetData.status || 'available',
        area_id: assetData.area?.id?.toString() || '',
        location: assetData.location || '',
        assigned_to: assetData.assigned_user?.id?.toString() || '',
        warranty_start_date: assetData.warranty_start_date || '',
        warranty_end_date: assetData.warranty_end_date || '',
        warranty_terms: assetData.warranty_terms || '',
      });
      setIsFormInitialized(true);
    }
  }, [assetData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/assets', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['assets']);
      toast.success('Activo creado correctamente');
      navigate(`/assets/${data.data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al crear activo');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/assets/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['assets']);
      queryClient.invalidateQueries(['asset', id]);
      toast.success('Activo actualizado correctamente');
      navigate(`/assets/${id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar activo');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      acquisition_cost: formData.acquisition_cost ? parseFloat(formData.acquisition_cost) : null,
      useful_life_years: formData.useful_life_years ? parseInt(formData.useful_life_years) : null,
      area_id: formData.area_id ? parseInt(formData.area_id) : null,
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : null,
    };

    // En modo edición, no enviar el código (es inmutable)
    if (isEditMode) {
      delete submitData.code;
    }

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

  if (isEditMode && loadingAsset) {
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
              onClick={() => navigate('/assets')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Activo' : 'Nuevo Activo'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del activo' : 'Registra un nuevo activo en el inventario'}
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
                <Input
                  label="Nombre *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ej: Laptop Dell"
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="Código"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="Se generará automáticamente"
                      readOnly={true}
                      disabled={true}
                      className="bg-gray-50 cursor-not-allowed"
                    />
                    {isEditMode && (
                      <p className="mt-1 text-xs text-gray-500">
                        El código no se puede modificar una vez creado
                      </p>
                    )}
                  </div>
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateCode}
                      className="mb-0"
                    >
                      Regenerar
                    </Button>
                  )}
                </div>
                <Input
                  label="Número de Serie"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Número de serie"
                />
                <Input
                  label="Categoría *"
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value });
                    // Regenerar código si cambia la categoría
                    if (!isEditMode) {
                      setTimeout(() => generateCode(), 100);
                    }
                  }}
                  required
                  placeholder="Ej: Equipos de cómputo"
                />
                <Input
                  label="Marca"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Marca del activo"
                />
                <Input
                  label="Modelo"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Modelo del activo"
                />
              </div>
              <div className="mt-4">
                <Textarea
                  label="Descripción"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descripción detallada del activo"
                />
              </div>
            </div>

            {/* Información Financiera */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Financiera</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Costo de Adquisición *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.acquisition_cost}
                  onChange={(e) => setFormData({ ...formData, acquisition_cost: e.target.value })}
                  required
                  placeholder="0.00"
                />
                <Input
                  label="Fecha de Compra"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
                <Input
                  label="Proveedor"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
                <Input
                  label="Número de Factura"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="Número de factura"
                />
                <Input
                  label="Orden de Compra"
                  value={formData.purchase_order}
                  onChange={(e) => setFormData({ ...formData, purchase_order: e.target.value })}
                  placeholder="Número de orden de compra"
                />
                <Input
                  label="Método de Pago"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  placeholder="Ej: Transferencia, Efectivo"
                />
                <Input
                  label="Vida Útil (años)"
                  type="number"
                  min="1"
                  value={formData.useful_life_years}
                  onChange={(e) => setFormData({ ...formData, useful_life_years: e.target.value })}
                  placeholder="Años de vida útil"
                />
              </div>
            </div>

            {/* Estado y Ubicación */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado y Ubicación</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Estado *"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  options={[
                    { value: 'available', label: 'Disponible' },
                    { value: 'in_use', label: 'En Uso' },
                    { value: 'maintenance', label: 'En Mantenimiento' },
                    { value: 'repair', label: 'En Reparación' },
                    { value: 'decommissioned', label: 'Dado de Baja' },
                  ]}
                />
                <Select
                  label="Área"
                  value={formData.area_id}
                  onChange={(e) => {
                    setFormData({ ...formData, area_id: e.target.value });
                    // Regenerar código si cambia el área
                    if (!isEditMode) {
                      setTimeout(() => generateCode(), 100);
                    }
                  }}
                  options={[
                    { value: '', label: 'Seleccionar área' },
                    ...(areasData?.map(area => ({
                      value: area.id.toString(),
                      label: area.name,
                    })) || []),
                  ]}
                />
                <Input
                  label="Ubicación"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Ubicación física específica"
                />
                <Select
                  label="Asignado a"
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

            {/* Garantía */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Garantía</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Fecha de Inicio de Garantía"
                  type="date"
                  value={formData.warranty_start_date}
                  onChange={(e) => setFormData({ ...formData, warranty_start_date: e.target.value })}
                />
                <Input
                  label="Fecha de Fin de Garantía"
                  type="date"
                  value={formData.warranty_end_date}
                  onChange={(e) => setFormData({ ...formData, warranty_end_date: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Textarea
                    label="Términos de Garantía"
                    value={formData.warranty_terms}
                    onChange={(e) => setFormData({ ...formData, warranty_terms: e.target.value })}
                    rows={3}
                    placeholder="Términos y condiciones de la garantía"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/assets')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar Activo' : 'Crear Activo'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

