import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { pushNotificationService } from '../services/pushNotificationService';
import { pushDebug } from '../utils/pushNotificationDebug';
import toast from 'react-hot-toast';

/**
 * Hook para manejar push notifications
 */
export function usePushNotifications(enabled = true) {
  const navigate = useNavigate();
  const lastNotificationId = useRef(null);
  const permissionRef = useRef(null);
  const didAutoSubscribeRef = useRef(false);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : null
  );

  // Manejar clics en notificaciones
  useEffect(() => {
    if (!enabled) return;

    const handleNotificationClick = (event) => {
      event.notification.close();
      const data = event.notification.data;
      if (data?.url) {
        navigate(data.url);
      }
    };

    // Escuchar clics en notificaciones del Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          const data = event.data.notificationData;
          if (data?.url) {
            navigate(data.url);
          }
        }
      });
    }

    // También escuchar eventos de notificación directa
    if ('Notification' in window) {
      // Esto se maneja en el Service Worker, pero por si acaso
      window.addEventListener('notificationclick', handleNotificationClick);
    }

    return () => {
      window.removeEventListener('notificationclick', handleNotificationClick);
    };
  }, [enabled, navigate]);

  // Verificar permisos de notificación
  useEffect(() => {
    if (!enabled) {
      console.log('[Push] Notifications disabled for this user');
      return;
    }

    // Debug: verificar soporte
    pushDebug.checkSupport();
    pushDebug.checkPermission();
    pushDebug.checkServiceWorker();

    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
      setPermission(Notification.permission);

      // Si no hay permiso, solicitarlo
      if (Notification.permission === 'default') {
        console.log('[Push] Requesting notification permission...');
        Notification.requestPermission().then((permission) => {
          console.log('[Push] Permission result:', permission);
          permissionRef.current = permission;
          setPermission(permission);
          if (permission === 'granted') {
            // Esperar un poco para que VitePWA termine de registrar el SW
            setTimeout(() => {
              console.log('[Push] Permission granted, subscribing...');
              pushNotificationService.subscribe()
                .then((subscription) => {
                  if (subscription) {
                    console.log('[Push] Subscription successful');
                  } else {
                    console.log('[Push] Fallback mode: Browser notifications enabled, push subscriptions disabled');
                  }
                })
                .catch((error) => {
                  console.warn('[Push] Subscription failed (non-fatal, using fallback):', error.message);
                  // No mostrar error, el modo fallback permite notificaciones del navegador
                });
            }, 2000);
          } else {
            console.warn('[Push] Permission denied:', permission);
          }
        });
      } else if (Notification.permission === 'granted') {
        // Evitar múltiples suscripciones automáticas (React StrictMode ejecuta efectos 2 veces en DEV)
        if (didAutoSubscribeRef.current) return;
        didAutoSubscribeRef.current = true;

        setTimeout(() => {
          console.log('[Push] Permission already granted, subscribing...');
          pushNotificationService.subscribe()
            .then((subscription) => {
              if (subscription) {
                console.log('[Push] Subscription successful');
              } else {
                console.log('[Push] Fallback mode: Browser notifications enabled, push subscriptions disabled');
              }
            })
            .catch((error) => {
              console.warn('[Push] Subscription failed (non-fatal, using fallback):', error.message);
            });
        }, 1000);
      } else {
        console.warn('[Push] Permission denied:', Notification.permission);
      }
    }
  }, [enabled]);

  // Polling para nuevas notificaciones
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications', {
        params: { is_read: false, per_page: 10 },
      });
      return response.data;
    },
    enabled: enabled && permission === 'granted',
    refetchInterval: 30000, // Refrescar cada 30 segundos
    refetchOnWindowFocus: true,
  });

  // Mostrar notificaciones push cuando hay nuevas
  useEffect(() => {
    if (!enabled || !notificationsData?.data) return;
    if (Notification.permission !== 'granted') return;

    const notifications = notificationsData.data;
    const latestNotification = notifications[0];

    // Si hay una nueva notificación
    if (
      latestNotification &&
      latestNotification.id !== lastNotificationId.current
    ) {
      lastNotificationId.current = latestNotification.id;

      // Mostrar notificación del navegador
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(latestNotification.title, {
            body: latestNotification.message,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `notification-${latestNotification.id}`,
            data: {
              url: latestNotification.action_url || '/notifications',
              notificationId: latestNotification.id,
              ...(latestNotification.data || {}),
            },
            requireInteraction: latestNotification.priority === 'urgent',
            actions: [
              {
                action: 'open',
                title: 'Abrir',
              },
              {
                action: 'close',
                title: 'Cerrar',
              },
            ],
          });
        });
      } else {
        // Fallback: usar API de Notificaciones directamente
        new Notification(latestNotification.title, {
          body: latestNotification.message,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `notification-${latestNotification.id}`,
          data: {
            url: latestNotification.action_url || '/notifications',
            notificationId: latestNotification.id,
          },
        });
      }
    }
  }, [notificationsData, enabled]);

  return {
    permission,
    isSupported: pushNotificationService.isSupported(),
  };
}

