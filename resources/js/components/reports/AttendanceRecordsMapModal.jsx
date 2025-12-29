import { useEffect, useMemo, useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const bounds = points.map((p) => [p.lat, p.lng]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function AttendanceRecordsMapModal({
  open,
  onClose,
  userName,
  startDate,
  endDate,
  points = [],
}) {
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!open) setSelectedId(null);
  }, [open]);

  const selected = useMemo(() => points.find((p) => p.id === selectedId) || null, [points, selectedId]);
  const polyline = useMemo(() => points.map((p) => [p.lat, p.lng]), [points]);

  const getTypeColor = (type) => {
    if (type === 'check_in') return '#22C55E';
    if (type === 'check_out') return '#EF4444';
    return '#6366F1';
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Mapa de marcaciones de asistencia"
      footer={<Button onClick={onClose}>Cerrar</Button>}
    >
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-sm text-gray-700">
              <span className="font-semibold text-gray-900">{userName || 'Personal'}</span>
              <span className="text-gray-400"> • </span>
              <span className="text-gray-600">
                {startDate || '-'} → {endDate || '-'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Tip: haz click en un punto para ver el detalle; usa la lista para navegar por marcaciones.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">Entrada</Badge>
            <Badge variant="danger" size="sm">Salida</Badge>
            <Badge variant="secondary" size="sm">{points.length} puntos</Badge>
          </div>
        </div>

        {points.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600">
            No hay marcaciones con coordenadas en el rango seleccionado. Asegúrate de que las asistencias estén
            guardando ubicación en formato <span className="font-mono">lat, lng</span>.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-sm font-semibold text-gray-900">
                Marcaciones ({points.length})
              </div>
              <div className="max-h-[420px] overflow-auto divide-y divide-gray-100">
                {points.map((p) => {
                  const isSelected = p.id === selectedId;
                  const color = getTypeColor(p.type);
                  const ts = p.timestamp ? new Date(p.timestamp).toLocaleString() : '-';
                  const label = p.type === 'check_in' ? 'Entrada' : (p.type === 'check_out' ? 'Salida' : p.type);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                        isSelected ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {label}
                              {p.mark_reason ? ` • ${p.mark_reason}` : ''}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5">{ts}</div>
                          {p.notes && <div className="text-xs text-gray-500 mt-1 line-clamp-2">{p.notes}</div>}
                          <div className="text-[11px] text-gray-500 mt-1 font-mono truncate">{p.location}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-3 rounded-lg border border-gray-200 overflow-hidden">
              <div className="h-[520px] w-full">
                <MapContainer
                  center={[points[0].lat, points[0].lng]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {polyline.length >= 2 && (
                    <Polyline positions={polyline} pathOptions={{ color: '#6366F1', weight: 3, opacity: 0.5 }} />
                  )}

                  {points.map((p) => {
                    const color = getTypeColor(p.type);
                    const ts = p.timestamp ? new Date(p.timestamp).toLocaleString() : '-';
                    const label = p.type === 'check_in' ? 'Entrada' : (p.type === 'check_out' ? 'Salida' : p.type);
                    const isSelected = p.id === selectedId;
                    return (
                      <CircleMarker
                        key={p.id}
                        center={[p.lat, p.lng]}
                        radius={isSelected ? 10 : 7}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }}
                        eventHandlers={{
                          click: () => setSelectedId(p.id),
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                          <div className="text-xs">
                            <div className="font-semibold">{label}</div>
                            <div>{ts}</div>
                          </div>
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}

                  <FitBounds points={points} />
                </MapContainer>
              </div>

              {selected && (
                <div className="px-3 py-2 border-t border-gray-100 bg-white">
                  <div className="text-sm font-semibold text-gray-900">
                    Detalle seleccionado
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {selected.type} {selected.mark_reason ? `(${selected.mark_reason})` : ''} •{' '}
                    {selected.timestamp ? new Date(selected.timestamp).toLocaleString() : '-'}
                  </div>
                  {selected.notes && <div className="text-xs text-gray-600 mt-1">{selected.notes}</div>}
                  <div className="text-[11px] text-gray-500 mt-1 font-mono">{selected.location}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}


