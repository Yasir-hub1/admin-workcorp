import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import MultiSelect from '../../components/common/MultiSelect';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CreateAreaPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    budget_monthly: '',
    budget_annual: '',
    phone: '',
    is_active: true,
    managers: [],
    colors: ['', '', ''], // 3 colores hexadecimales
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Función para generar código automáticamente basado en el nombre
  const generateCode = async () => {
    if (isEditMode || !formData.name || formData.name.trim().length < 2) return;
    
    try {
      const response = await apiClient.get('/areas/generate-code', {
        params: { name: formData.name },
      });
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

  // Generar código cuando cambia el nombre (con debounce)
  useEffect(() => {
    if (!isEditMode && formData.name && formData.name.trim().length >= 2) {
      const timeoutId = setTimeout(() => {
        generateCode();
      }, 500); // Esperar 500ms después de que el usuario deje de escribir
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.name]);

  // Obtener área si está en modo edición
  const { data: areaData, isLoading: loadingArea } = useQuery({
    queryKey: ['area', id],
    queryFn: async () => {
      const response = await apiClient.get(`/areas/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener personal activo para el select de jefes
  const { data: staffData } = useQuery({
    queryKey: ['staff-for-area-managers'],
    queryFn: async () => {
      const response = await apiClient.get('/staff', {
        params: { is_active: true, per_page: 1000 },
      });
      return response.data.data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del área
  useEffect(() => {
    if (isEditMode && areaData && !isFormInitialized) {
      setFormData({
        name: areaData.name || '',
        code: areaData.code || '',
        description: areaData.description || '',
        budget_monthly: areaData.budget_monthly?.toString() || '',
        budget_annual: areaData.budget_annual?.toString() || '',
        phone: areaData.phone || '',
        is_active: areaData.is_active ?? true,
        managers: areaData.managers?.map(m => m.id.toString()) || [],
        colors: areaData.colors && Array.isArray(areaData.colors) 
          ? [...areaData.colors, '', '', ''].slice(0, 3) // Asegurar 3 elementos
          : ['', '', ''],
      });
      // Cargar preview del logo si existe
      if (areaData.logo_path) {
        setLogoPreview(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/storage/${areaData.logo_path}`);
      }
      setIsFormInitialized(true);
    }
  }, [areaData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData();
      
      // Agregar campos de texto
      Object.keys(data).forEach(key => {
        if (key === 'logo') {
          if (data.logo) {
            formDataToSend.append('logo', data.logo);
          }
        } else if (key === 'colors') {
          // Filtrar colores vacíos y enviar solo los válidos
          const validColors = data.colors.filter(c => c && c.trim() !== '');
          if (validColors.length > 0) {
            validColors.forEach((color, index) => {
              formDataToSend.append(`colors[${index}]`, color);
            });
          }
        } else if (key === 'is_active') {
          // Enviar is_active como "1" o "0" para que Laravel lo interprete como booleano
          formDataToSend.append(key, data[key] ? '1' : '0');
        } else if (key !== 'logo') {
          if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
            if (Array.isArray(data[key])) {
              data[key].forEach((item, index) => {
                formDataToSend.append(`${key}[${index}]`, item);
              });
            } else {
              formDataToSend.append(key, data[key]);
            }
          }
        }
      });

      const response = await apiClient.post('/areas', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['areas']);
      toast.success('Área creada correctamente');
      navigate(`/areas/${data.data.id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al crear área';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData();
      
      // Agregar campos de texto
      Object.keys(data).forEach(key => {
        if (key === 'logo') {
          if (data.logo) {
            formDataToSend.append('logo', data.logo);
          }
        } else if (key === 'colors') {
          // Filtrar colores vacíos y enviar solo los válidos
          const validColors = data.colors.filter(c => c && c.trim() !== '');
          if (validColors.length > 0) {
            validColors.forEach((color, index) => {
              formDataToSend.append(`colors[${index}]`, color);
            });
          } else {
            formDataToSend.append('colors', '[]'); // Array vacío para eliminar colores
          }
        } else if (key === 'is_active') {
          // Enviar is_active como "1" o "0" para que Laravel lo interprete como booleano
          formDataToSend.append(key, data[key] ? '1' : '0');
        } else if (key !== 'logo') {
          if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
            if (Array.isArray(data[key])) {
              data[key].forEach((item, index) => {
                formDataToSend.append(`${key}[${index}]`, item);
              });
            } else {
              formDataToSend.append(key, data[key]);
            }
          }
        }
      });

      const response = await apiClient.put(`/areas/${id}`, formDataToSend);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['areas']);
      queryClient.invalidateQueries(['area', id]);
      toast.success('Área actualizada correctamente');
      navigate(`/areas/${id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al actualizar área';
      toast.error(errorMessage);
    },
  });

  // Función para comprimir imagen manteniendo dimensiones y calidad
  const compressImage = (file, maxSizeMB = 10, quality = 0.9) => {
    return new Promise((resolve, reject) => {
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      // Si el archivo ya es menor que el máximo, no comprimir
      if (file.size <= maxSizeBytes) {
        resolve(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Crear canvas con las mismas dimensiones
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          // Intentar comprimir con diferentes niveles de calidad
          let currentQuality = quality;
          let compressedBlob = null;
          
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Error al comprimir la imagen'));
                  return;
                }
                
                // Si el tamaño es aceptable o la calidad es muy baja, usar este blob
                if (blob.size <= maxSizeBytes || currentQuality <= 0.3) {
                  // Crear un nuevo File con el mismo nombre y tipo
                  const compressedFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  // Reducir calidad y intentar de nuevo
                  currentQuality -= 0.1;
                  tryCompress();
                }
              },
              file.type,
              currentQuality
            );
          };
          
          tryCompress();
        };
        
        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        toast.error('El archivo debe ser una imagen');
        e.target.value = ''; // Limpiar el input
        return;
      }
      
      // Validar tamaño máximo (10MB)
      const maxSizeBytes = 10 * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast.error('El archivo no debe superar los 10MB');
        e.target.value = ''; // Limpiar el input
        return;
      }
      
      try {
        // Comprimir imagen si es necesario (mantiene dimensiones y calidad)
        const compressedFile = await compressImage(file, 10, 0.85);
        setLogoFile(compressedFile);
        
        // Crear preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result);
        };
        reader.readAsDataURL(compressedFile);
        
        // Mostrar mensaje si se comprimió
        if (compressedFile.size < file.size) {
          const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
          toast.success(`Imagen comprimida: ${reduction}% de reducción`);
        }
      } catch (error) {
        console.error('Error al procesar la imagen:', error);
        toast.error('Error al procesar la imagen. Intenta con otra.');
        e.target.value = ''; // Limpiar el input
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      budget_monthly: formData.budget_monthly ? parseFloat(formData.budget_monthly) : 0,
      budget_annual: formData.budget_annual ? parseFloat(formData.budget_annual) : 0,
      phone: formData.phone || null,
      is_active: formData.is_active === true || formData.is_active === 'true',
      managers: formData.managers.map(id => parseInt(id)),
      logo: logoFile,
      colors: formData.colors.filter(c => c && c.trim() !== ''), // Solo colores válidos
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Opciones para el MultiSelect de managers
  const managerOptions = useMemo(() => {
    if (!staffData) return [];
    return staffData.map(staff => {
      const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
      const displayName = fullName ||
                         staff.full_name ||
                         (staff.employee_number ? `N° ${staff.employee_number}` : 'Sin nombre');
      const position = staff.position ? ` - ${staff.position}` : '';
      return {
        value: staff.id.toString(),
        label: `${displayName}${position}`,
      };
    });
  }, [staffData]);

  if (isEditMode && loadingArea) {
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
              onClick={() => navigate('/areas')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Área' : 'Nueva Área'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del área' : 'Registra un nuevo área'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: Ventas"
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Código"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Se generará automáticamente"
                    readOnly={!isEditMode}
                    className={!isEditMode ? 'bg-gray-50' : ''}
                  />
                </div>
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateCode}
                    className="mb-0"
                    disabled={!formData.name || formData.name.trim().length < 2}
                  >
                    Regenerar
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo del Área
              </label>
              <div className="space-y-3">
                {logoPreview && (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-32 w-32 object-contain border border-gray-300 rounded-lg p-2 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Formatos: JPEG, PNG, JPG, GIF, SVG. Tamaño máximo: 10MB (se comprimirá automáticamente si es necesario)
                  </p>
                </div>
              </div>
            </div>

            {/* Colores */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Colores del Área (2-3 colores hexadecimales)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.colors[index] || '#000000'}
                        onChange={(e) => {
                          const newColors = [...formData.colors];
                          newColors[index] = e.target.value;
                          setFormData({ ...formData, colors: newColors });
                        }}
                        className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                      />
                      <Input
                        placeholder="#000000"
                        value={formData.colors[index] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Validar formato hexadecimal
                          if (value === '' || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
                            const newColors = [...formData.colors];
                            newColors[index] = value;
                            setFormData({ ...formData, colors: newColors });
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                    {formData.colors[index] && (
                      <div className="mt-2 flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ backgroundColor: formData.colors[index] }}
                        />
                        <span className="text-xs text-gray-500">{formData.colors[index]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Puedes usar 2 o 3 colores. Deja vacío para no usar un color.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jefes de Área (Puede seleccionar uno o varios) *
              </label>
              <MultiSelect
                name="managers"
                value={formData.managers}
                onChange={(values) => setFormData({ ...formData, managers: values })}
                options={managerOptions}
                placeholder="Seleccionar jefes de área..."
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Presupuesto Mensual"
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_monthly}
                onChange={(e) => setFormData({ ...formData, budget_monthly: e.target.value })}
              />
              <Input
                label="Presupuesto Anual"
                type="number"
                step="0.01"
                min="0"
                value={formData.budget_annual}
                onChange={(e) => setFormData({ ...formData, budget_annual: e.target.value })}
              />
            </div>
            <Input
              label="Teléfono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">Área activa</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/areas')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar' : 'Crear'} Área
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

