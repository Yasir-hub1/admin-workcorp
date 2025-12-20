import React from "react";
import { createRoot } from "react-dom/client";
import { usePWA } from "./hooks/usePWA";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

function App() {
  const { updateAvailable, offlineReady, needRefresh, updateServiceWorker } = usePWA();

  return (
    <>
      <div style={{ fontFamily: "sans-serif", padding: 24 }}>
        <h1>Laravel + React + PWA (Monolito)</h1>
        <p>Listo para instalar como app.</p>

        {offlineReady && (
          <div style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: "#d4edda",
            color: "#155724",
            borderRadius: 4
          }}>
            ✓ App lista para funcionar offline
          </div>
        )}

        {updateAvailable && needRefresh && (
          <div style={{
            marginTop: 16,
            padding: 12,
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: 4
          }}>
            <p>Nueva versión disponible</p>
            <button
              onClick={updateServiceWorker}
              style={{
                marginTop: 8,
                padding: "8px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer"
              }}
            >
              Actualizar ahora
            </button>
          </div>
        )}
      </div>
      <PWAInstallPrompt />
    </>
  );
}

const root = createRoot(document.getElementById("app"));
root.render(<App />);
