import { useEffect, useState } from 'react';

export function usePWA() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [updateSW, setUpdateSW] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Importar dinámicamente para evitar errores en desarrollo
      import('virtual:pwa-register/react').then(({ registerSW }) => {
        const updateServiceWorker = registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true);
            setUpdateAvailable(true);
          },
          onOfflineReady() {
            setOfflineReady(true);
            console.log('App lista para funcionar offline');
          },
          onRegistered(reg) {
            setRegistration(reg);
            console.log('Service Worker registrado:', reg);
          },
          onRegisterError(error) {
            console.error('Error al registrar Service Worker:', error);
          },
        });
        setUpdateSW(() => updateServiceWorker);
      }).catch((error) => {
        console.warn('No se pudo cargar el módulo PWA (normal en desarrollo):', error);
      });
    }
  }, []);

  const updateServiceWorker = () => {
    if (updateSW) {
      updateSW(true);
    } else if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return {
    updateAvailable,
    offlineReady,
    needRefresh,
    registration,
    updateServiceWorker,
  };
}

