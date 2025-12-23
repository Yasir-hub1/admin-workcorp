import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient } from "./api/queryClient";
import { usePWA } from "./hooks/usePWA";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import AppRouter from "./router/AppRouter";
import "../css/app.css";
import "./bootstrap";

function App() {
  const { updateAvailable, offlineReady, needRefresh, updateServiceWorker } = usePWA();

  return (
    <>
      <AppRouter />

      {/* PWA Update Notification */}
      <AnimatePresence>
        {updateAvailable && needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 right-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 shadow-xl max-w-sm z-50"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-medium text-yellow-800 mb-2"
            >
              Nueva versión disponible
            </motion.p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={updateServiceWorker}
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 text-sm font-medium transition-all shadow-md"
            >
              Actualizar ahora
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Offline Ready Notification */}
      <AnimatePresence>
        {offlineReady && (
          <motion.div
            initial={{ opacity: 0, x: -50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 left-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 shadow-xl max-w-sm z-50"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-green-800 font-medium flex items-center gap-2"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                ✓
              </motion.span>
              Aplicación lista para funcionar offline
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <PWAInstallPrompt />
    </>
  );
}

const root = createRoot(document.getElementById("app"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  </React.StrictMode>
);
