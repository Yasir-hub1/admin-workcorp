/**
 * Utilidades para debug de push notifications
 */

export const pushDebug = {
  log: (message, data = {}) => {
    if (import.meta.env.DEV) {
      console.log(`[Push Debug] ${message}`, data);
    }
  },
  
  error: (message, error) => {
    console.error(`[Push Debug] ${message}`, error);
  },
  
  checkSupport: () => {
    const support = {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notifications: 'Notification' in window,
    };
    
    console.log('[Push Debug] Browser support:', support);
    return Object.values(support).every(v => v === true);
  },
  
  checkServiceWorker: async () => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[Push Debug] Service Worker not supported');
      return null;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push Debug] Service Worker ready:', {
        scope: registration.scope,
        active: !!registration.active,
        waiting: !!registration.waiting,
        installing: !!registration.installing,
      });
      return registration;
    } catch (error) {
      console.error('[Push Debug] Service Worker error:', error);
      return null;
    }
  },
  
  checkSubscription: async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        console.log('[Push Debug] Active subscription:', {
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          expirationTime: subscription.expirationTime,
          options: subscription.options,
        });
      } else {
        console.warn('[Push Debug] No active subscription');
      }
      
      return subscription;
    } catch (error) {
      console.error('[Push Debug] Subscription check error:', error);
      return null;
    }
  },
  
  checkPermission: () => {
    if (!('Notification' in window)) {
      console.warn('[Push Debug] Notifications not supported');
      return null;
    }
    
    const permission = Notification.permission;
    console.log('[Push Debug] Notification permission:', permission);
    return permission;
  },
};
