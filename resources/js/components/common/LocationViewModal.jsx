import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from './Modal';
import Button from './Button';

// Fix para los iconos de Leaflet en React
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para centrar el mapa en la ubicación
function MapCenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [map, lat, lng]);
  return null;
}

export default function LocationViewModal({ open, onClose, lat, lng, address }) {
  if (!lat || !lng) {
    return null;
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={address ? "Ubicación de la Marcación" : "Ubicación del Domicilio"}
      size="lg"
      footer={
        <Button onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        {address && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <p className="text-sm text-gray-900">{address}</p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitud
            </label>
            <p className="text-sm text-gray-900">{latitude}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitud
            </label>
            <p className="text-sm text-gray-900">{longitude}</p>
          </div>
        </div>

        <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
          <MapContainer
            center={[latitude, longitude]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]} />
            <MapCenter lat={latitude} lng={longitude} />
          </MapContainer>
        </div>

        <div className="text-xs text-gray-500">
          <a
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&zoom=15`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Abrir en OpenStreetMap ↗
          </a>
        </div>
      </div>
    </Modal>
  );
}

