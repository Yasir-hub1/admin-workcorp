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

export default function CreateExpensePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expense_date: '',
    category: '',
    subcategory: '',
    area_id: '',
    cost_center: '',
    project_id: '',
    document_number: '',
    supplier_ruc_dni: '',
    supplier_name: '',
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener gasto si está en modo edición
  const { data: expenseData, isLoading: loadingExpense } = useQuery({
    queryKey: ['expense', id],
    queryFn: async () => {
      const response = await apiClient.get(`/expenses/${id}`);
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

  // Inicializar formulario con datos del gasto
  useEffect(() => {
    if (isEditMode && expenseData && !isFormInitialized) {
      setFormData({
        description: expenseData.description || '',
        amount: expenseData.amount?.toString() || '',
        expense_date: expenseData.expense_date || '',
        category: expenseData.category || '',
        subcategory: expenseData.subcategory || '',
        area_id: expenseData.area?.id?.toString() || '',
        cost_center: expenseData.cost_center || '',
        project_id: expenseData.project_id?.toString() || '',
        document_number: expenseData.document_number || '',
        supplier_ruc_dni: expenseData.supplier_ruc_dni || '',
        supplier_name: expenseData.supplier_name || '',
      });
      setIsFormInitialized(true);
    }
  }, [expenseData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/expenses', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['expenses']);
      toast.success('Gasto registrado correctamente');
      navigate(`/expenses/${data.data.id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al registrar gasto');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/expenses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['expenses']);
      queryClient.invalidateQueries(['expense', id]);
      toast.success('Gasto actualizado correctamente');
      navigate(`/expenses/${id}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error al actualizar gasto');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      area_id: formData.area_id ? parseInt(formData.area_id) : null,
      project_id: formData.project_id ? parseInt(formData.project_id) : null,
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

  if (isEditMode && loadingExpense) {
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
              onClick={() => navigate('/expenses')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Gasto' : 'Registrar Gasto'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del gasto' : 'Registra un nuevo gasto en el sistema'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Básica */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Gasto</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Textarea
                    label="Descripción *"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    placeholder="Descripción detallada del gasto"
                  />
                </div>
                <Input
                  label="Monto *"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0.00"
                />
                <Input
                  label="Fecha del Gasto *"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                />
                <Input
                  label="Categoría *"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  placeholder="Ej: Operativos, Administrativos"
                />
                <Input
                  label="Subcategoría"
                  value={formData.subcategory}
                  onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                  placeholder="Subcategoría del gasto"
                />
                <Select
                  label="Área *"
                  value={formData.area_id}
                  onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                  required
                  options={[
                    { value: '', label: 'Seleccionar área' },
                    ...(areasData?.map(area => ({
                      value: area.id.toString(),
                      label: area.name,
                    })) || []),
                  ]}
                />
                <Input
                  label="Centro de Costos"
                  value={formData.cost_center}
                  onChange={(e) => setFormData({ ...formData, cost_center: e.target.value })}
                  placeholder="Centro de costos"
                />
                <Input
                  label="ID de Proyecto"
                  type="number"
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  placeholder="ID del proyecto asociado"
                />
              </div>
            </div>

            {/* Información del Proveedor */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del Proveedor</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="NIT/CI del Proveedor"
                  value={formData.supplier_ruc_dni}
                  onChange={(e) => setFormData({ ...formData, supplier_ruc_dni: e.target.value })}
                  placeholder="NIT o CI del proveedor"
                />
                <Input
                  label="Nombre del Proveedor"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
                <Input
                  label="Número de Documento"
                  value={formData.document_number}
                  onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                  placeholder="Número de factura o boleta"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/expenses')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar Gasto' : 'Registrar Gasto'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

