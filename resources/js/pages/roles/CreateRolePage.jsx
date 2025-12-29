import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Textarea from '../../components/common/Textarea';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

function normalizeText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function PermissionsSelector({ permissionsData, value, onChange }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());

  const modules = Object.entries(permissionsData || {});

  // Expandir todos al cargar por primera vez (UX: el usuario ve qué hay)
  useEffect(() => {
    if (!permissionsData) return;
    const next = new Set(Object.keys(permissionsData));
    setExpanded(next);
  }, [permissionsData]);

  const selectedSet = new Set((value || []).map(String));

  const filteredModules = modules
    .map(([module, perms]) => {
      const s = normalizeText(search);
      const filteredPerms = !s
        ? perms
        : perms.filter((p) => {
            const hay = normalizeText(`${p.display_name} ${p.name} ${module}`);
            return hay.includes(s);
          });
      return [module, filteredPerms];
    })
    .filter(([, perms]) => perms.length > 0);

  const togglePermission = (id) => {
    const sid = String(id);
    const next = new Set(selectedSet);
    if (next.has(sid)) next.delete(sid);
    else next.add(sid);
    onChange(Array.from(next));
  };

  const selectAllVisible = () => {
    const next = new Set(selectedSet);
    filteredModules.forEach(([, perms]) => perms.forEach((p) => next.add(String(p.id))));
    onChange(Array.from(next));
  };

  const clearAllVisible = () => {
    const next = new Set(selectedSet);
    filteredModules.forEach(([, perms]) => perms.forEach((p) => next.delete(String(p.id))));
    onChange(Array.from(next));
  };

  const selectAllModule = (module, perms) => {
    const next = new Set(selectedSet);
    perms.forEach((p) => next.add(String(p.id)));
    onChange(Array.from(next));
  };

  const clearModule = (module, perms) => {
    const next = new Set(selectedSet);
    perms.forEach((p) => next.delete(String(p.id)));
    onChange(Array.from(next));
  };

  const isExpanded = (module) => expanded.has(module);
  const toggleModule = (module) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex-1">
          <Input
            icon={MagnifyingGlassIcon}
            placeholder="Buscar permisos por nombre o módulo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={selectAllVisible}>
            Seleccionar visibles
          </Button>
          <Button type="button" variant="outline" onClick={clearAllVisible}>
            Limpiar visibles
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Seleccionados: <span className="font-semibold text-gray-900">{selectedSet.size}</span>
        {search ? <span> • filtrando por “{search}”</span> : null}
      </div>

      <div className="space-y-2">
        {filteredModules.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600">
            No hay permisos que coincidan con la búsqueda.
          </div>
        ) : (
          filteredModules.map(([module, perms]) => {
            const moduleLabel = String(module).replaceAll('_', ' ');
            const total = perms.length;
            const selectedInModule = perms.reduce((acc, p) => acc + (selectedSet.has(String(p.id)) ? 1 : 0), 0);
            const allSelected = total > 0 && selectedInModule === total;
            const someSelected = selectedInModule > 0 && !allSelected;

            return (
              <div key={module} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleModule(module)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 flex items-center justify-between"
                >
                  <div className="min-w-0 text-left">
                    <div className="text-sm font-semibold text-gray-900 capitalize truncate">
                      {moduleLabel}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {selectedInModule}/{total} seleccionados
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {someSelected && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        parcial
                      </span>
                    )}
                    {allSelected && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                        completo
                      </span>
                    )}
                    <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${isExpanded(module) ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded(module) && (
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => selectAllModule(module, perms)}>
                        Seleccionar todo
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => clearModule(module, perms)}>
                        Limpiar
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((perm) => {
                        const checked = selectedSet.has(String(perm.id));
                        return (
                          <label
                            key={perm.id}
                            className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                              checked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">
                                {perm.display_name}
                              </div>
                              <div className="text-xs text-gray-500 font-mono break-all mt-1">
                                {perm.name}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function CreateRolePage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const isEditMode = !!id;

  const canAccess = isSuperAdmin() || hasPermission(isEditMode ? 'roles.edit' : 'roles.create');
  if (!canAccess) {
    return (
      <AppLayout>
        <Card>
          <div className="text-gray-900 font-semibold">{isEditMode ? 'Editar Rol' : 'Nuevo Rol'}</div>
          <div className="text-sm text-gray-500 mt-1">No tienes permisos para realizar esta acción.</div>
        </Card>
      </AppLayout>
    );
  }

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: [],
  });

  const [isFormInitialized, setIsFormInitialized] = useState(false);

  // Obtener rol si está en modo edición
  const { data: roleData, isLoading: loadingRole } = useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      const response = await apiClient.get(`/roles/${id}`);
      return response.data.data;
    },
    enabled: isEditMode && !!id && isAuthenticated && !!user,
    retry: 1,
  });

  // Obtener todos los permisos agrupados por módulo
  const { data: permissionsData } = useQuery({
    queryKey: ['permissions-grouped'],
    queryFn: async () => {
      const response = await apiClient.get('/roles/permissions');
      return response.data.data || {};
    },
    enabled: isAuthenticated && !!user,
  });

  // Inicializar formulario con datos del rol
  useEffect(() => {
    if (isEditMode && roleData && !isFormInitialized) {
      setFormData({
        name: roleData.name || '',
        display_name: roleData.display_name || '',
        description: roleData.description || '',
        permissions: roleData.permissions?.map(p => p.id.toString()) || [],
      });
      setIsFormInitialized(true);
    }
  }, [roleData, isEditMode, isFormInitialized]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/roles', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Rol creado correctamente');
      navigate(`/roles/${data.data.id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al crear rol';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.put(`/roles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      queryClient.invalidateQueries(['role', id]);
      toast.success('Rol actualizado correctamente');
      navigate(`/roles/${id}`);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors
        ? Object.values(error.response.data.errors).flat().join(', ')
        : 'Error al actualizar rol';
      toast.error(errorMessage);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      name: formData.name,
      display_name: formData.display_name,
      description: formData.description || null,
      permissions: formData.permissions.map(id => parseInt(id)),
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  if (isEditMode && loadingRole) {
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
              onClick={() => navigate('/roles')}
              icon={ArrowLeftIcon}
            >
              Volver
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {isEditMode ? 'Editar Rol' : 'Nuevo Rol'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {isEditMode ? 'Modifica la información del rol' : 'Registra un nuevo rol'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre del Rol *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: editor"
                helperText="Nombre técnico del rol (sin espacios, minúsculas)"
              />
              <Input
                label="Nombre para Mostrar *"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                required
                placeholder="Ej: Editor"
              />
            </div>
            <Textarea
              label="Descripción"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Permisos *
              </label>
              <PermissionsSelector
                permissionsData={permissionsData}
                value={formData.permissions}
                onChange={(values) => setFormData({ ...formData, permissions: values })}
              />
              <p className="mt-1 text-xs text-gray-500">
                Selecciona los permisos que tendrá este rol. Los permisos definen qué acciones puede realizar el usuario.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/roles')}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {isEditMode ? 'Actualizar' : 'Crear'} Rol
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}

