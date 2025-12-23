import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e) => {
      // Prevenir que el navegador muestre el prompt automático
      e.preventDefault();
      // Guardar el evento para usarlo después
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    // Verificar si el evento está disponible
    if ('beforeinstallprompt' in window) {
      window.addEventListener('beforeinstallprompt', handler);
    }

    // Verificar si la app ya está instalada
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallButton(false);
    }

    return () => {
      if ('beforeinstallprompt' in window) {
        window.removeEventListener('beforeinstallprompt', handler);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA');
    } else {
      console.log('Usuario rechazó instalar la PWA');
    }

    // Limpiar
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  return (
    <AnimatePresence>
      {showInstallButton && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-5 right-5 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-xl z-50 max-w-xs"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-3 text-sm font-medium"
          >
            Instala esta app en tu dispositivo para una mejor experiencia
          </motion.p>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleInstallClick}
              className="px-4 py-2 bg-white text-blue-600 border-none rounded-md cursor-pointer font-bold flex-1 transition-all hover:bg-gray-100"
            >
              Instalar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInstallButton(false)}
              className="px-4 py-2 bg-transparent text-white border border-white rounded-md cursor-pointer transition-all hover:bg-white/20"
            >
              Cerrar
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

