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
      import('virtual:pwa-register/react')
        .then((module) => {
          // Verificar que registerSW existe
          if (!module || typeof module.registerSW !== 'function') {
            return;
          }
          
          const updateServiceWorker = module.registerSW({
          immediate: true,
          onNeedRefresh() {
            setNeedRefresh(true);
            setUpdateAvailable(true);
          },
          onOfflineReady() {
            setOfflineReady(true);
              console.log('[PWA] App lista para funcionar offline');
          },
          onRegistered(reg) {
            setRegistration(reg);
              console.log('[PWA] Service Worker registrado:', reg?.scope);
          },
          onRegisterError(error) {
              console.warn('[PWA] Error al registrar Service Worker:', error?.message || error);
          },
        });
        setUpdateSW(() => updateServiceWorker);
        })
        .catch((error) => {
          // Solo mostrar warning si no es el error esperado de módulo no encontrado
          if (!error.message?.includes('Failed to fetch dynamically imported module') && 
              !error.message?.includes('Cannot find module')) {
            console.warn('[PWA] No se pudo cargar el módulo PWA:', error.message);
          }
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

