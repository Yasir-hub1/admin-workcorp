import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { MapPinIcon } from '@heroicons/react/24/outline';

// Fix para los iconos de Leaflet en React
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para manejar clicks en el mapa
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationMapModal({ open, onClose, onConfirm, initialLat, initialLng, address }) {
  const [selectedLat, setSelectedLat] = useState(initialLat || -16.5000); // La Paz, Bolivia por defecto
  const [selectedLng, setSelectedLng] = useState(initialLng || -68.1500);
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialLat && initialLng) {
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
    }
  }, [initialLat, initialLng]);

  const handleLocationSelect = (lat, lng) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    // Intentar obtener la dirección usando Nominatim (OpenStreetMap)
    setIsSearching(true);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=es`)
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          setSearchAddress(data.display_name);
        }
        setIsSearching(false);
      })
      .catch(() => {
        setIsSearching(false);
      });
  };

  const handleSearch = () => {
    if (!searchAddress.trim()) return;
    
    setIsSearching(true);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&accept-language=es`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const result = data[0];
          setSelectedLat(parseFloat(result.lat));
          setSelectedLng(parseFloat(result.lon));
        }
        setIsSearching(false);
      })
      .catch(() => {
        setIsSearching(false);
      });
  };

  const handleConfirm = () => {
    onConfirm(selectedLat, selectedLng, searchAddress);
    onClose();
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleLocationSelect(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          alert('Error al obtener la ubicación: ' + error.message);
        }
      );
    } else {
      alert('La geolocalización no está disponible en este navegador');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Seleccionar Ubicación del Domicilio"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Confirmar Ubicación
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar dirección..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleSearch}
              loading={isSearching}
              variant="outline"
            >
              Buscar
            </Button>
            <Button
              type="button"
              onClick={handleGetCurrentLocation}
              variant="outline"
              icon={MapPinIcon}
            >
              Mi Ubicación
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Haz clic en el mapa o busca una dirección para seleccionar la ubicación
          </p>
        </div>

        <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300">
          <MapContainer
            center={[selectedLat, selectedLng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[selectedLat, selectedLng]} />
            <MapClickHandler onLocationSelect={handleLocationSelect} />
          </MapContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Latitud
            </label>
            <Input
              type="number"
              step="any"
              value={selectedLat}
              onChange={(e) => setSelectedLat(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Longitud
            </label>
            <Input
              type="number"
              step="any"
              value={selectedLng}
              onChange={(e) => setSelectedLng(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

