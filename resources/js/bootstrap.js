import axios from 'axios';

/**
 * We'll load the axios HTTP library which allows us to easily issue requests
 * to our Laravel back-end. This library automatically handles sending the
 * CSRF token as a header based on the value of the "XSRF" token cookie.
 */

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
window.axios.defaults.withCredentials = true;

/**
 * Echo exposes an expressive API for subscribing to channels and listening
 * for events that are broadcast by Laravel. Echo and event broadcasting
 * allows your team to easily build robust real-time web applications.
 */

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

// Only initialize Echo if Pusher credentials are available
if (import.meta.env.VITE_PUSHER_APP_KEY) {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env.VITE_PUSHER_APP_KEY,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER ?? 'mt1',
        wsHost: import.meta.env.VITE_PUSHER_HOST ?? `ws-${import.meta.env.VITE_PUSHER_APP_CLUSTER}.pusher.com`,
        wsPort: import.meta.env.VITE_PUSHER_PORT ?? 80,
        wssPort: import.meta.env.VITE_PUSHER_PORT ?? 443,
        forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
    });
} else {
    console.warn('Pusher credentials not found. Real-time features will be disabled.');
}

export default axios;

/**
 * Script defensivo para prevenir errores de addEventListener en elementos null
 * Esto previene errores como "Cannot read properties of null (reading 'addEventListener')"
 */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Suprimir errores de share-modal.js de forma global (no es parte de React y revienta por null.addEventListener)
  // Nota: esto NO “abre DevTools”; solo evita errores repetitivos que suelen disparar tooling/extensiones.
  window.onerror = function(message, source) {
    try {
      if (typeof source === 'string' && source.includes('share-modal')) {
        return true; // suprime el error
      }
    } catch {
      // ignore
    }
    return false;
  };

  // Interceptar addEventListener directamente en el prototipo de Element
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    // Si this es null o undefined, simplemente retornar sin hacer nada
    if (this === null || this === undefined) {
      console.warn('[Share Modal] Attempted to addEventListener on null/undefined element. Ignoring.');
      return;
    }
    
    // Si this no tiene las propiedades esperadas, crear un objeto mock
    if (typeof this !== 'object' || this.nodeType === undefined) {
      // Puede ser un objeto mock, intentar llamar al método original de forma segura
      try {
        return originalAddEventListener.call(this, type, listener, options);
      } catch (error) {
        if (error.message && error.message.includes('addEventListener')) {
          console.warn('[Share Modal] Prevented addEventListener error:', error.message);
          return;
        }
        throw error;
      }
    }
    
    // Llamar al método original
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // También interceptar querySelector y getElementById para retornar objetos mock seguros
  const originalQuerySelector = document.querySelector;
  const originalGetElementById = document.getElementById;
  const originalQuerySelectorAll = document.querySelectorAll;
  
  // Crear objeto mock seguro
  const createSafeMock = () => ({
    addEventListener: () => {},
    removeEventListener: () => {},
    click: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    removeChild: () => {},
    innerHTML: '',
    textContent: '',
  });
  
  const isShareModalSelector = (value) => {
    if (!value || typeof value !== 'string') return false;
    const v = value.toLowerCase();
    // IMPORTANTE: NO interceptar genéricamente "modal" porque rompe modales reales (HeadlessUI/React)
    // Solo proteger selectores/ids típicos del script share-modal.
    return (
      v.includes('share-modal') ||
      v.includes('sharemodal') ||
      v.includes('share_button') ||
      v.includes('sharebutton') ||
      v.includes('btnshare') ||
      v.includes('share-btn') ||
      v.includes('share_')
    );
  };

  document.querySelector = function(selector) {
    const element = originalQuerySelector.call(document, selector);
    if (!element && isShareModalSelector(selector)) {
      console.warn(`[Share Modal] Element not found: ${selector}. Returning safe mock.`);
      return createSafeMock();
    }
    return element;
  };
  
  document.getElementById = function(id) {
    const element = originalGetElementById.call(document, id);
    if (!element && isShareModalSelector(id)) {
      console.warn(`[Share Modal] Element not found: ${id}. Returning safe mock.`);
      return createSafeMock();
    }
    return element;
  };
  
  document.querySelectorAll = function(selector) {
    const elements = originalQuerySelectorAll.call(document, selector);
    if (elements.length === 0 && isShareModalSelector(selector)) {
      console.warn(`[Share Modal] Elements not found: ${selector}. Returning empty NodeList.`);
      return document.createDocumentFragment().childNodes; // Retornar NodeList vacío
    }
    return elements;
  };
  
  // Interceptar setTimeout para capturar errores
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = function(callback, delay, ...args) {
    if (typeof callback === 'function') {
      const wrappedCallback = function() {
        try {
          return callback.apply(this, arguments);
        } catch (error) {
          if (error && (error.message?.includes('addEventListener') || error.message?.includes('null') || error.message?.includes('undefined'))) {
            console.warn('[Share Modal] Prevented error in setTimeout callback:', error.message);
            return;
          }
          // Re-lanzar otros errores
          throw error;
        }
      };
      return originalSetTimeout.call(window, wrappedCallback, delay, ...args);
    }
    return originalSetTimeout.call(window, callback, delay, ...args);
  };
  
  // Interceptar errores globales relacionados con share-modal
  window.addEventListener('error', function(event) {
    if (event.filename && event.filename.includes('share-modal')) {
      console.warn('[Share Modal] Global error caught and suppressed:', event.message);
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    }
  }, true);
}
