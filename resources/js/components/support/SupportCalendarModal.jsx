import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isSaturday, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import apiClient from '../../api/client';
import Modal from '../common/Modal';
import Select from '../common/Select';
import MultiSelect from '../common/MultiSelect';
import Button from '../common/Button';
import Input from '../common/Input';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { cn } from '../../utils/helpers';

const EMPTY_ARRAY = [];

const COLOR_PRESETS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#dc2626', // red
  '#7c3aed', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
];

function hexWithAlpha(hex, alpha = '20') {
  if (!hex || typeof hex !== 'string') return undefined;
  const h = hex.trim();
  if (!h.startsWith('#') || (h.length !== 7 && h.length !== 4)) return undefined;
  if (h.length === 7) return `${h}${alpha}`;
  // #rgb -> #rrggbb
  const r = h[1]; const g = h[2]; const b = h[3];
  return `#${r}${r}${g}${g}${b}${b}${alpha}`;
}

export default function SupportCalendarModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const { user, isSuperAdmin, hasPermission } = useAuthStore();
  const canManage = isSuperAdmin() || hasPermission('support_calendar.manage');

  const [activeMonth, setActiveMonth] = useState(() => new Date());
  const monthStart = useMemo(() => startOfMonth(activeMonth), [activeMonth]);
  const monthEnd = useMemo(() => endOfMonth(activeMonth), [activeMonth]);
  const gridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const gridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);

  const [tab, setTab] = useState('calendario'); // calendario | auto | visibilidad
  const [selectedDate, setSelectedDate] = useState(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignColor, setAssignColor] = useState(COLOR_PRESETS[0]);
  const [assignNotes, setAssignNotes] = useState('');

  const [autoStart, setAutoStart] = useState(() => format(monthStart, 'yyyy-MM-01'));
  const [autoEnd, setAutoEnd] = useState(() => format(addMonths(monthStart, 2), 'yyyy-MM-dd'));
  const [autoUserIds, setAutoUserIds] = useState([]);
  const [autoOverwrite, setAutoOverwrite] = useState(false);

  const [viewerIds, setViewerIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    // reset selección al abrir
    setSelectedDate(null);
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ['support-calendar', format(gridStart, 'yyyy-MM-dd'), format(gridEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const res = await apiClient.get('/support-calendar', {
        params: {
          start_date: format(gridStart, 'yyyy-MM-dd'),
          end_date: format(gridEnd, 'yyyy-MM-dd'),
        },
      });
      return res.data.data;
    },
    enabled: open && !!user,
    staleTime: 15_000,
  });

  // IMPORTANT: evitar `|| []` porque crea un array nuevo en cada render cuando `data` es undefined.
  // Eso puede disparar loops de `useEffect` (Maximum update depth exceeded).
  const users = data?.users ?? EMPTY_ARRAY;
  const assignments = data?.assignments ?? EMPTY_ARRAY;
  const viewers = data?.viewers ?? EMPTY_ARRAY;

  useEffect(() => {
    if (!canManage) return;
    if (!data?.viewers) return; // solo inicializar cuando el backend realmente envió viewers
    setViewerIds(viewers.map((v) => v.user_id));
  }, [canManage, data?.viewers, viewers]);

  const assignmentByDate = useMemo(() => {
    const map = new Map();
    for (const a of assignments) map.set(a.duty_date, a);
    return map;
  }, [assignments]);

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate) throw new Error('Selecciona un sábado');
      if (!assignUserId) throw new Error('Selecciona un personal');
      const res = await apiClient.post('/support-calendar/assign', {
        duty_date: format(selectedDate, 'yyyy-MM-dd'),
        user_id: Number(assignUserId),
        color: assignColor,
        notes: assignNotes || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-calendar'] });
      toast.success('Turno asignado');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Error al asignar');
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!autoStart || !autoEnd) throw new Error('Completa rango de fechas');
      if (!autoUserIds?.length) throw new Error('Selecciona personal para rotación');
      const res = await apiClient.post('/support-calendar/generate', {
        start_date: autoStart,
        end_date: autoEnd,
        user_ids: autoUserIds.map((x) => Number(x)),
        overwrite: autoOverwrite,
      });
      return res.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['support-calendar'] });
      toast.success(res?.message || 'Generado');
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Error al generar');
    },
  });

  const viewersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/support-calendar/viewers', {
        user_ids: viewerIds.map((x) => Number(x)),
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visibilidad actualizada');
      queryClient.invalidateQueries({ queryKey: ['support-calendar'] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err.message || 'Error al guardar visibilidad');
    },
  });

  const days = useMemo(() => {
    const out = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      out.push(cursor);
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }
    return out;
  }, [gridStart, gridEnd]);

  const legend = useMemo(() => {
    const uniq = new Map();
    for (const a of assignments) {
      if (!a?.user?.id) continue;
      const key = String(a.user.id);
      if (!uniq.has(key)) uniq.set(key, { name: a.user.name, color: a.color || '#2563eb' });
    }
    return Array.from(uniq.values()).slice(0, 8);
  }, [assignments]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Calendario de Soporte (Sábados)"
      size="full"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            {canManage ? 'Modo admin: asigna y genera turnos, y define quién ve el calendario.' : 'Modo lectura: verás tus turnos y los sábados programados.'}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setActiveMonth((d) => subMonths(d, 1))}>Mes anterior</Button>
            <div className="text-lg font-semibold text-gray-900">{format(activeMonth, 'MMMM yyyy')}</div>
            <Button variant="secondary" onClick={() => setActiveMonth((d) => addMonths(d, 1))}>Mes siguiente</Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant={tab === 'calendario' ? 'primary' : 'secondary'} onClick={() => setTab('calendario')}>Calendario</Button>
            {canManage && (
              <>
                <Button variant={tab === 'auto' ? 'primary' : 'secondary'} onClick={() => setTab('auto')}>Automático</Button>
                <Button variant={tab === 'visibilidad' ? 'primary' : 'secondary'} onClick={() => setTab('visibilidad')}>Visibilidad</Button>
              </>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-gray-600">Cargando calendario…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500 mb-2">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                  <div key={d} className="px-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const a = assignmentByDate.get(key);
                  const isSel = selectedDate && isSameDay(day, selectedDate);
                  const saturday = isSaturday(day);
                  const inMonth = isSameMonth(day, monthStart);
                  const isMine = a?.user_id && user?.id && a.user_id === user.id;

                  const bg = a?.color ? hexWithAlpha(a.color, '22') : saturday ? '#fef3c7' : undefined;
                  const border = isMine ? 'border-2 border-emerald-400' : 'border border-gray-200';

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day);
                        if (canManage && saturday) {
                          setAssignNotes(a?.notes || '');
                          setAssignColor(a?.color || COLOR_PRESETS[0]);
                          setAssignUserId(a?.user_id ? String(a.user_id) : '');
                        }
                      }}
                      className={cn(
                        'rounded-lg p-2 text-left transition shadow-sm hover:shadow',
                        border,
                        isSel ? 'ring-2 ring-blue-400' : '',
                        !inMonth ? 'opacity-50' : '',
                        !saturday ? 'cursor-default' : 'cursor-pointer'
                      )}
                      style={{ backgroundColor: bg }}
                      disabled={!saturday && !canManage}
                      title={a ? `${a.user?.name || 'Asignado'} (${key})` : saturday ? `Sábado ${key}` : key}
                    >
                      <div className="flex items-center justify-between">
                        <div className={cn('text-sm font-semibold', saturday ? 'text-gray-900' : 'text-gray-500')}>
                          {format(day, 'd')}
                        </div>
                        {saturday && (
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full', a ? 'bg-white/70 text-gray-800' : 'bg-gray-100 text-gray-600')}>
                            SÁB
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-700">
                        {a ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: a.color || '#2563eb' }} />
                            <span className="truncate">{a.user?.name || 'Asignado'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">{saturday ? 'Sin asignar' : ''}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {legend.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {legend.map((l) => (
                    <div key={l.name} className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="text-gray-700">{l.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              {tab === 'calendario' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">Detalle</div>
                  <div className="mt-2 text-sm text-gray-700">
                    {selectedDate ? (
                      <>
                        <div className="font-medium">{format(selectedDate, 'yyyy-MM-dd')}</div>
                        {!isSaturday(selectedDate) ? (
                          <div className="text-gray-500 mt-1">Este módulo solo gestiona sábados.</div>
                        ) : (
                          <>
                            {(() => {
                              const a = assignmentByDate.get(format(selectedDate, 'yyyy-MM-dd'));
                              if (!a) return <div className="mt-2 text-gray-500">Sin asignación.</div>;
                              return (
                                <div className="mt-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: a.color || '#2563eb' }} />
                                    <span className="font-medium">{a.user?.name || 'Asignado'}</span>
                                  </div>
                                  {a.notes && <div className="mt-2 text-gray-600">{a.notes}</div>}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-gray-500">Selecciona un sábado para ver/editar su asignación.</div>
                    )}
                  </div>

                  {canManage && selectedDate && isSaturday(selectedDate) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="text-sm font-semibold text-gray-900">Asignar soporte</div>
                      {users.length === 0 && (
                        <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                          No se encontró personal para listar. Verifica que existan usuarios con rol <b>personal</b> (o staff activo con usuario) y que estén activos.
                        </div>
                      )}
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <Select
                          label="Personal"
                          value={assignUserId}
                          onChange={(e) => setAssignUserId(e.target.value)}
                          options={[
                            { value: '', label: 'Seleccionar...' },
                            ...users.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` })),
                          ]}
                        />

                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Color</div>
                          <div className="flex flex-wrap gap-2">
                            {COLOR_PRESETS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setAssignColor(c)}
                                className={cn('w-7 h-7 rounded-full border', assignColor === c ? 'ring-2 ring-blue-400' : 'border-gray-200')}
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            ))}
                          </div>
                        </div>

                        <Input
                          label="Nota (opcional)"
                          value={assignNotes}
                          onChange={(e) => setAssignNotes(e.target.value)}
                          placeholder="Ej: soporte on-site, guardia, etc."
                        />

                        <Button
                          onClick={() => assignMutation.mutate()}
                          loading={assignMutation.isPending}
                        >
                          Guardar asignación
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canManage && tab === 'auto' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">Generación automática (rotación)</div>
                  <div className="mt-2 text-sm text-gray-600">
                    Selecciona un rango y el orden de personal. Se asignarán los sábados en modo round-robin.
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <Input label="Desde" type="date" value={autoStart} onChange={(e) => setAutoStart(e.target.value)} />
                    <Input label="Hasta" type="date" value={autoEnd} onChange={(e) => setAutoEnd(e.target.value)} />

                    <MultiSelect
                      label="Personal (orden de rotación)"
                      name="support_calendar_rotation_users"
                      options={users.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` }))}
                      value={autoUserIds.map(String)}
                      onChange={(vals) => setAutoUserIds(vals)}
                      placeholder="Selecciona personal…"
                    />

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={autoOverwrite} onChange={(e) => setAutoOverwrite(e.target.checked)} />
                      Sobrescribir sábados ya asignados
                    </label>

                    <Button onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
                      Generar sábados
                    </Button>
                  </div>
                </div>
              )}

              {canManage && tab === 'visibilidad' && (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="text-sm font-semibold text-gray-900">¿Quién ve el calendario?</div>
                  <div className="mt-2 text-sm text-gray-600">
                    Recomendación UX: incluye a todo el personal que pueda ser asignado. El asignado se agrega automáticamente al asignar/generar.
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    {users.length === 0 && (
                      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        No se encontró personal para listar. Cuando el backend devuelva usuarios, aquí podrás dar acceso.
                      </div>
                    )}
                    <MultiSelect
                      label="Personal con acceso"
                      name="support_calendar_viewers"
                      options={users.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` }))}
                      value={viewerIds.map(String)}
                      onChange={(vals) => setViewerIds(vals)}
                      placeholder="Selecciona usuarios…"
                    />
                    <Button onClick={() => viewersMutation.mutate()} loading={viewersMutation.isPending}>
                      Guardar visibilidad
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}


