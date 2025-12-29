import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';
import { cn } from '../../utils/helpers';
import Button from '../common/Button';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import MultiSelect from '../common/MultiSelect';
import Badge from '../common/Badge';
import toast from 'react-hot-toast';
import { ClipboardIcon, EyeIcon, EyeSlashIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function NotesWidget() {
  const queryClient = useQueryClient();
  const { user, isSuperAdmin } = useAuthStore();

  const { notesWidgetOpen: open, toggleNotesWidget } = useUIStore();
  const [mode, setMode] = useState('list'); // list | create | view
  const [scope, setScope] = useState('visible'); // visible|mine|assigned
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  // create form
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipientIds, setRecipientIds] = useState([]);
  const [isSensitive, setIsSensitive] = useState(true);

  // view state
  const [revealBody, setRevealBody] = useState(false);

  const { data: staffList } = useQuery({
    queryKey: ['staff', 'for-notes-widget'],
    queryFn: async () => {
      const res = await apiClient.get('/staff', { params: { per_page: 300, is_active: 'true' } });
      return res.data?.data || [];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const recipientOptions = useMemo(() => {
    const list = staffList || [];
    return list
      .filter((s) => s && s.user_id)
      .map((s) => ({
        value: String(s.user_id),
        label: s.full_name || s.user?.name || (s.employee_number ? `N° ${s.employee_number}` : `ID ${s.user_id}`),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [staffList]);

  const { data: notesResp, isLoading } = useQuery({
    queryKey: ['notes', { scope, q }],
    queryFn: async () => {
      const res = await apiClient.get('/notes', { params: { scope, q: q || undefined, per_page: 20 } });
      return res.data;
    },
    enabled: !!user,
    staleTime: 15000,
  });

  const notes = notesResp?.data || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Título requerido');
      if (!body.trim()) throw new Error('Contenido requerido');
      if (!recipientIds.length) throw new Error('Selecciona destinatarios');
      const res = await apiClient.post('/notes', {
        title: title.trim(),
        body: body,
        is_sensitive: isSensitive,
        recipient_user_ids: recipientIds.map((x) => Number(x)),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Nota creada');
      setTitle('');
      setBody('');
      setRecipientIds([]);
      setIsSensitive(true);
      setMode('list');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (e) => {
      toast.error(e?.response?.data?.message || e.message || 'Error al crear nota');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/notes/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Nota eliminada');
      setSelected(null);
      setMode('list');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'No se pudo eliminar'),
  });

  const canDelete = (note) => isSuperAdmin() || note?.created_by === user?.id;

  const openNote = async (id) => {
    try {
      const res = await apiClient.get(`/notes/${id}`);
      setSelected(res.data.data);
      setRevealBody(false);
      setMode('view');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'No se pudo abrir la nota');
    }
  };

  const copyBody = async () => {
    if (!selected?.body) return;
    try {
      await navigator.clipboard.writeText(selected.body);
      toast.success('Copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  if (!user) return null;

  return (
    <div className={cn(
      'hidden xl:block fixed top-16 right-3 z-30',
      'w-[360px] max-w-[calc(100vw-24px)]'
    )}>
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-gray-900">Notas</div>
            <Badge variant="secondary" size="sm">{notes.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleNotesWidget()}
              className="text-xs font-medium text-gray-600 hover:text-gray-900"
            >
              {open ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        {open && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar por título…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={() => {
                  setMode('create');
                  setSelected(null);
                }}
                icon={PencilSquareIcon}
              >
                Nueva
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScope('visible')}
                className={cn('text-xs px-3 py-1 rounded-full border',
                  scope === 'visible' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700')}
              >
                Visibles
              </button>
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={cn('text-xs px-3 py-1 rounded-full border',
                  scope === 'mine' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700')}
              >
                Mías
              </button>
              <button
                type="button"
                onClick={() => setScope('assigned')}
                className={cn('text-xs px-3 py-1 rounded-full border',
                  scope === 'assigned' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-700')}
              >
                Asignadas
              </button>
            </div>

            {mode === 'create' && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Nueva nota</div>
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className="text-gray-500 hover:text-gray-900"
                    title="Cerrar"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
                <MultiSelect
                  label="Destinatarios"
                  name="notes_recipients"
                  options={recipientOptions}
                  value={recipientIds}
                  onChange={(vals) => setRecipientIds(vals)}
                  placeholder="Selecciona personal…"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isSensitive} onChange={(e) => setIsSensitive(e.target.checked)} />
                  Contenido sensible (recomendado)
                </label>
                <Textarea
                  label="Contenido"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Ej: credenciales, IPs, endpoints, pasos…"
                />
                <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} fullWidth>
                  Guardar nota
                </Button>
              </div>
            )}

            {mode === 'view' && selected && (
              <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{selected.title}</div>
                    <div className="text-xs text-gray-500">
                      {selected.creator?.name ? `Por ${selected.creator.name}` : '—'} • {new Date(selected.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRevealBody((v) => !v)}
                      className="text-gray-600 hover:text-gray-900"
                      title={revealBody ? 'Ocultar' : 'Mostrar'}
                    >
                      {revealBody ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={copyBody}
                      disabled={!revealBody}
                      className={cn('text-gray-600 hover:text-gray-900', !revealBody && 'opacity-40 cursor-not-allowed')}
                      title="Copiar"
                    >
                      <ClipboardIcon className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('list')}
                      className="text-gray-600 hover:text-gray-900"
                      title="Cerrar"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {(selected.recipients || []).map((r) => (
                    <Badge key={r.id} variant="secondary" size="sm">{r.name}</Badge>
                  ))}
                  {selected.is_sensitive && <Badge variant="warning" size="sm">sensible</Badge>}
                </div>

                <div className="text-xs text-gray-500">
                  {revealBody ? 'Visible (cuidado al compartir pantalla)' : 'Oculto por seguridad'}
                </div>

                <div className={cn('text-sm font-mono whitespace-pre-wrap rounded-md border p-2',
                  revealBody ? 'bg-gray-50 border-gray-200 text-gray-900' : 'bg-gray-100 border-gray-200 text-gray-400 select-none')}
                >
                  {revealBody ? (selected.body || '') : '••••••••••••••••••••••'}
                </div>

                {canDelete(selected) && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selected.id)}
                    loading={deleteMutation.isPending}
                    fullWidth
                  >
                    Eliminar nota
                  </Button>
                )}
              </div>
            )}

            {mode === 'list' && (
              <div className="max-h-[520px] overflow-auto divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white">
                {isLoading ? (
                  <div className="p-3 text-sm text-gray-500">Cargando…</div>
                ) : notes.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No hay notas visibles.</div>
                ) : (
                  notes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => openNote(n.id)}
                      className="w-full text-left px-3 py-3 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{n.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {n.creator?.name ? `Por ${n.creator.name}` : '—'} • {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {n.is_sensitive && <Badge variant="warning" size="sm">sensible</Badge>}
                          {isSuperAdmin() && n.creator && n.created_by !== user?.id && (
                            <Badge variant="secondary" size="sm">{n.creator.name}</Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


