import apiClient from '../api/client';

/**
 * Service for managing push notifications
 */
class PushNotificationService {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.subscribing = false; // Flag para evitar suscripciones múltiples
    this.registrationAttempts = 0; // Contador de intentos de registro
    this.maxRegistrationAttempts = 5; // Máximo de intentos antes de usar fallback
    this.lastRegistrationAttempt = 0; // Timestamp del último intento
  }

  /**
   * Check if push notifications are supported
   */
  isSupported() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Register service worker
   * VitePWA registra el SW automáticamente, solo necesitamos esperar a que esté listo
   * Retorna null si no está disponible (modo fallback)
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push] Service workers are not supported.');
      return null;
    }

    // 1) Limpiar registrations “atascadas” o duplicadas (esto te estaba generando “intentando instalarse”)
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const scriptURL =
          reg?.active?.scriptURL ||
          reg?.installing?.scriptURL ||
          reg?.waiting?.scriptURL ||
          '';

        // Nos quedamos SOLO con nuestro SW estable /sw.js para push
        const keep = scriptURL.includes('/sw.js');
        if (!keep) {
          try {
            await reg.unregister();
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }

    // 2) Si ya existe /sw.js registrado, úsalo
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      const existing = regs.find((reg) => {
        const scriptURL =
          reg?.active?.scriptURL ||
          reg?.installing?.scriptURL ||
          reg?.waiting?.scriptURL ||
          '';
        return scriptURL.includes('/sw.js');
      });
      if (existing) {
        this.registration = existing;
        return existing;
      }
    } catch {
      // ignore
    }

    // 3) Registrar SIEMPRE el SW estable (mismo origen: http://localhost:8000/sw.js)
    try {
      const swUrl = '/sw.js';
      this.registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
        updateViaCache: 'none',
      });

      // Nota: para Push, no necesitamos que “controle” la página; PushManager vive en la registration.
      return this.registration;
    } catch (e) {
      console.error('[Push] Failed to register /sw.js:', e?.message || e);
      return null;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    // Evitar suscripciones múltiples simultáneas
    if (this.subscribing) {
      console.log('[Push] Subscription already in progress, waiting...');
      // Esperar a que termine la suscripción actual
      while (this.subscribing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (this.subscription) {
        console.log('[Push] Using existing subscription');
        return this.subscription;
      }
    }

    this.subscribing = true;
    console.log('[Push] Starting subscription process...');
    
    try {
      if (!this.isSupported()) {
        console.error('[Push] Push notifications not supported');
        throw new Error('Push notifications are not supported');
      }

      // Verificar permisos
      console.log('[Push] Requesting notification permission...');
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.error('[Push] Notification permission denied');
        throw new Error('Notification permission denied');
      }
      console.log('[Push] Permission granted');

      // Registrar service worker (puede retornar null en modo fallback)
      console.log('[Push] Registering service worker...');
      let registration;
      try {
        registration = await this.registerServiceWorker();
        
      if (!registration) {
        // Modo fallback: Service Worker no disponible, pero las notificaciones del navegador funcionarán
        // Solo mostrar el mensaje una vez
        if (this.registrationAttempts <= 1) {
          console.warn('[Push] Service Worker not available. Push subscriptions disabled.');
          console.log('[Push] Browser notifications will still work, but server-side push is disabled.');
        }
        // Retornar null para indicar que no hay suscripción push, pero las notificaciones funcionan
        this.subscription = null;
        return null;
      }
        
        console.log('[Push] Service worker registered successfully:', {
          scope: registration.scope,
          active: !!registration.active,
        });
      } catch (error) {
        console.warn('[Push] Service Worker registration failed. Using fallback mode:', error.message);
        // No lanzar error, usar modo fallback
        this.subscription = null;
        return null;
      }

      // Verificar que el registration tenga pushManager
      if (!registration || !registration.pushManager) {
        console.error('[Push] ❌ Registration or PushManager not available:', {
          hasRegistration: !!registration,
          hasPushManager: !!(registration && registration.pushManager),
          registrationState: registration ? {
            active: !!registration.active,
            installing: !!registration.installing,
            waiting: !!registration.waiting,
          } : null,
        });
        this.subscription = null;
        return null;
      }

      // Obtener suscripción existente o crear nueva
      console.log('[Push] Checking for existing subscription...');
      let subscription;
      try {
        subscription = await registration.pushManager.getSubscription();
        console.log('[Push] Existing subscription:', subscription ? '✅ Found' : '❌ Not found');
        if (subscription) {
          console.log('[Push] Subscription endpoint:', subscription.endpoint.substring(0, 50) + '...');
          console.log('[Push] Subscription keys:', {
            hasP256dh: !!subscription.getKey('p256dh'),
            hasAuth: !!subscription.getKey('auth'),
          });
        }
      } catch (error) {
        console.error('[Push] ❌ Error checking subscription:', error);
        console.error('[Push] Error details:', {
          message: error.message,
          name: error.name,
        });
        this.subscription = null;
        return null;
      }

      if (!subscription) {
        console.log('[Push] Creating new subscription...');
        // Crear nueva suscripción
        // VAPID Public Key: BLSyF0ihMaEN_AGFYfIN6mNztJiViEiefGwmnznusI7vBOEO97nH_XVUDOdZq3LWMmLoNlXubFfp6raPDEcaLP4
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 
          'BLSyF0ihMaEN_AGFYfIN6mNztJiViEiefGwmnznusI7vBOEO97nH_XVUDOdZq3LWMmLoNlXubFfp6raPDEcaLP4';
        
        console.log('[Push] Using VAPID key:', vapidPublicKey.substring(0, 20) + '...');
        const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey);

        if (!applicationServerKey) {
          console.warn('[Push] Invalid VAPID public key. Using fallback mode.');
          this.subscription = null;
          return null;
        }

        console.log('[Push] Subscribing to push manager...');
        console.log('[Push] Registration details:', {
          hasRegistration: !!registration,
          hasPushManager: !!(registration && registration.pushManager),
          hasApplicationServerKey: !!applicationServerKey,
          keyLength: applicationServerKey?.length || 0,
        });
        
        try {
          if (!registration || !registration.pushManager) {
            throw new Error('Registration or PushManager not available');
          }
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey,
          });
          
          console.log('[Push] ✅ Subscription created successfully!');
          console.log('[Push] Subscription details:', {
            endpoint: subscription.endpoint.substring(0, 50) + '...',
            expirationTime: subscription.expirationTime,
            hasKeys: !!subscription.getKey('p256dh') && !!subscription.getKey('auth'),
          });
        } catch (subscribeError) {
          console.error('[Push] ❌ Error creating subscription:', subscribeError);
          console.error('[Push] Error details:', {
            message: subscribeError.message,
            name: subscribeError.name,
            code: subscribeError.code,
          });
          
          // Si es un error de permisos o VAPID, dar más información
          if (subscribeError.message?.includes('permission') || subscribeError.message?.includes('denied')) {
            console.error('[Push] ⚠️ Permission issue. Make sure notification permissions are granted.');
          }
          if (subscribeError.message?.includes('VAPID') || subscribeError.message?.includes('key')) {
            console.error('[Push] ⚠️ VAPID key issue. Check VITE_VAPID_PUBLIC_KEY environment variable.');
          }
          
          this.subscription = null;
          return null;
        }
      }

      this.subscription = subscription;

      // Enviar suscripción al backend solo si tenemos una suscripción válida
      if (subscription) {
      console.log('[Push] Sending subscription to server...');
        console.log('[Push] Subscription details:', {
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          hasKeys: !!subscription.getKey('p256dh') && !!subscription.getKey('auth'),
        });
        try {
          const result = await this.sendSubscriptionToServer(subscription);
          console.log('[Push] Subscription sent to server successfully:', result);
          // Verificar que se guardó correctamente
          if (result?.success) {
            console.log('[Push] ✅ Push subscription registered in backend');
          } else {
            console.warn('[Push] ⚠️ Subscription sent but may not be saved correctly');
          }
        } catch (error) {
          console.error('[Push] ❌ Error sending subscription to server:', error);
          console.error('[Push] Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
          // No lanzar error, la suscripción local está bien, pero loguear para debug
        }
      } else {
        console.warn('[Push] ⚠️ No subscription to send to server (fallback mode)');
      }

      return subscription;
    } catch (error) {
      console.error('[Push] Subscription error:', error);
      throw error;
    } finally {
      this.subscribing = false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.subscription) {
      const registration = await this.registerServiceWorker();
      this.subscription = await registration.pushManager.getSubscription();
    }

    if (this.subscription) {
      const unsubscribed = await this.subscription.unsubscribe();
      if (unsubscribed) {
        await this.removeSubscriptionFromServer(this.subscription);
        this.subscription = null;
      }
    }
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')),
      },
    };

    console.log('[Push] 📤 Sending subscription to server...');
    console.log('[Push] Subscription data:', {
      endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
      hasKeys: !!subscriptionData.keys.p256dh && !!subscriptionData.keys.auth,
      p256dhLength: subscriptionData.keys.p256dh?.length || 0,
      authLength: subscriptionData.keys.auth?.length || 0,
    });

    try {
      console.log('[Push] POST /api/v1/push-subscriptions');
      const response = await apiClient.post('/push-subscriptions', subscriptionData);
      console.log('[Push] ✅ Subscription saved to server:', {
        success: response.data?.success,
        message: response.data?.message,
        subscriptionId: response.data?.data?.id,
        userId: response.data?.data?.user_id,
      });
      return response.data;
    } catch (error) {
      console.error('[Push] ❌ Error sending subscription to server:', error);
      console.error('[Push] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        method: error.config?.method,
      });
      
      // Si es un error 401, puede ser un problema de autenticación
      if (error.response?.status === 401) {
        console.error('[Push] ⚠️ Authentication error. Make sure you are logged in.');
      }
      
      // Si es un error 422, puede ser un problema de validación
      if (error.response?.status === 422) {
        console.error('[Push] ⚠️ Validation error:', error.response?.data?.errors);
      }
      
      throw error;
    }
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer(subscription) {
    try {
      await apiClient.delete('/push-subscriptions', {
        data: { endpoint: subscription.endpoint },
      });
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    if (!base64String) return null;
    
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Initialize push notifications
   */
  async initialize() {
    if (!this.isSupported()) {
      return false;
    }

    try {
      // Verificar si ya hay una suscripción
      const registration = await this.registerServiceWorker();
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        this.subscription = existingSubscription;
        // Verificar con el servidor si la suscripción es válida
        try {
          await apiClient.get('/push-subscriptions');
        } catch (error) {
          // Si falla, intentar re-suscribir
          if (error.response?.status === 404) {
            await this.subscribe();
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error initializing push notifications:', error);
      return false;
    }
  }
}

export const pushNotificationService = new PushNotificationService();


