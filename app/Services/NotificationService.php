<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Cachea si el entorno soporta generar claves EC (necesario para cifrar payload WebPush).
     * Algunos entornos (especialmente en macOS) pueden fallar con openssl_pkey_new().
     */
    private static ?bool $webPushEncryptionSupported = null;

    private static function isWebPushEncryptionSupported(): bool
    {
        if (self::$webPushEncryptionSupported !== null) {
            return self::$webPushEncryptionSupported;
        }

        try {
            if (!extension_loaded('openssl')) {
                self::$webPushEncryptionSupported = false;
                return false;
            }

            // Probar creación de clave EC P-256 (esto es lo que usa la librería para cifrar el payload).
            // En algunos entornos OpenSSL exige private_key_bits (aunque no se use para EC) y si no se pasa toma "0".
            $key = openssl_pkey_new([
                'curve_name' => 'prime256v1',
                'private_key_type' => OPENSSL_KEYTYPE_EC,
                'private_key_bits' => 2048,
            ]);

            self::$webPushEncryptionSupported = $key !== false;
        } catch (\Throwable $e) {
            self::$webPushEncryptionSupported = false;
        }

        return self::$webPushEncryptionSupported;
    }
    /**
     * Create a notification for a user.
     */
    public static function create(
        int $userId,
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $priority = 'normal',
        ?array $data = null
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $actionUrl,
            'priority' => $priority,
            'data' => $data,
        ]);
    }

    /**
     * Notify multiple users.
     */
    public static function notifyMany(
        array $userIds,
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $priority = 'normal',
        ?array $data = null
    ): void {
        $notifications = [];
        foreach ($userIds as $userId) {
            $notifications[] = [
                'user_id' => $userId,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'action_url' => $actionUrl,
                'priority' => $priority,
                'data' => $data ? json_encode($data) : null, // Convertir array a JSON para insert()
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        Notification::insert($notifications);
    }

    /**
     * Notify all users in an area.
     */
    public static function notifyArea(
        int $areaId,
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $priority = 'normal',
        ?array $data = null
    ): void {
        $userIds = User::where('area_id', $areaId)
            ->where('is_active', true)
            ->pluck('id')
            ->toArray();

        if (!empty($userIds)) {
            self::notifyMany($userIds, $type, $title, $message, $actionUrl, $priority, $data);
        }
    }

    /**
     * Notify managers (jefes de área).
     */
    public static function notifyManagers(
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $priority = 'normal',
        ?array $data = null
    ): void {
        $userIds = User::whereHas('roles', function ($query) {
            $query->where('name', 'jefe_area');
        })
        ->where('is_active', true)
        ->pluck('id')
        ->toArray();

        if (!empty($userIds)) {
            self::notifyMany($userIds, $type, $title, $message, $actionUrl, $priority, $data);
        }
    }

    /**
     * Notify super admins.
     */
    public static function notifySuperAdmins(
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $priority = 'normal',
        ?array $data = null
    ): void {
        $userIds = User::whereHas('roles', function ($query) {
            $query->where('name', 'super_admin');
        })
        ->where('is_active', true)
        ->pluck('id')
        ->toArray();

        if (!empty($userIds)) {
            self::notifyMany($userIds, $type, $title, $message, $actionUrl, $priority, $data);
        }
    }

    /**
     * Notify managers and super admins.
     */
    public static function notifyManagersAndAdmins(
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $priority = 'normal',
        ?array $data = null
    ): void {
        $userIds = User::where(function ($query) {
            $query->whereHas('roles', function ($q) {
                $q->whereIn('name', ['jefe_area', 'super_admin']);
            });
        })
        ->where('is_active', true)
        ->pluck('id')
        ->toArray();

        if (!empty($userIds)) {
            self::notifyMany($userIds, $type, $title, $message, $actionUrl, $priority, $data);
            // Enviar push notifications
            self::sendPushNotifications($userIds, $title, $message, $actionUrl, $data);
        }
    }

    /**
     * Notify managers (jefes de área) of a specific area + super admins.
     * Esto respeta el modelo de visibilidad: jefes solo ven su área, admins ven todo.
     */
    public static function notifyAreaManagersAndAdmins(
        int $areaId,
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
        string $priority = 'normal',
        ?array $data = null
    ): void {
        $userIds = User::where(function ($query) use ($areaId) {
            $query
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'super_admin');
                })
                ->orWhere(function ($q) use ($areaId) {
                    $q->where('area_id', $areaId)
                        ->whereHas('roles', function ($rq) {
                            $rq->where('name', 'jefe_area');
                        });
                });
        })
            ->where('is_active', true)
            ->pluck('id')
            ->unique()
            ->toArray();

        if (!empty($userIds)) {
            self::notifyMany($userIds, $type, $title, $message, $actionUrl, $priority, $data);
            self::sendPushNotifications($userIds, $title, $message, $actionUrl, $data);
        }
    }

    /**
     * Send push notifications to users using Web Push API.
     */
    public static function sendPushNotifications(
        array $userIds,
        string $title,
        string $message,
        ?string $actionUrl = null,
        ?array $data = null
    ): void {
        // Verificar si la librería web-push está instalada
        if (!class_exists(\Minishlink\WebPush\WebPush::class)) {
            Log::warning('Web Push library not installed. Install with: composer require minishlink/web-push');
            return;
        }

        $subscriptions = PushSubscription::whereIn('user_id', $userIds)
            ->where('is_active', true)
            ->get();

        if ($subscriptions->isEmpty()) {
            Log::info('Web Push: no active subscriptions for users', ['user_ids' => $userIds]);
            return;
        }

        Log::info('Web Push: sending push notifications', [
            'user_ids' => $userIds,
            'subscriptions_count' => $subscriptions->count(),
            'title' => $title,
        ]);

        // Configurar VAPID
        $vapidConfig = config('services.vapid');
        
        // Limpiar el subject (remover espacios extra)
        $subject = trim(str_replace(['<', '>'], '', $vapidConfig['subject']));
        if (!str_starts_with($subject, 'mailto:')) {
            $subject = 'mailto:' . $subject;
        }
        
        $auth = [
            'VAPID' => [
                'subject' => $subject,
                'publicKey' => $vapidConfig['public_key'],
                'privateKey' => $vapidConfig['private_key'],
            ],
        ];
        
        Log::info('Web Push: VAPID config', [
            'subject' => $subject,
            'public_key_length' => strlen($vapidConfig['public_key']),
            'private_key_length' => strlen($vapidConfig['private_key']),
        ]);

        $webPush = new \Minishlink\WebPush\WebPush($auth);

        foreach ($subscriptions as $subscription) {
            try {
                self::sendPushNotification($webPush, $subscription, $title, $message, $actionUrl, $data);
            } catch (\Exception $e) {
                Log::error('Error sending push notification', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
                // No desactivar por cualquier excepción: solo se desactiva si el reporte marca expiración (410) en flush()
            }
        }

        // Enviar todas las notificaciones
        try {
            foreach ($webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();
                
                if (!$report->isSuccess()) {
                    Log::error('Push notification failed', [
                        'endpoint' => $endpoint,
                        'reason' => $report->getReason(),
                    ]);

                    // Si la suscripción es inválida (410 Gone), marcarla como inactiva
                    if ($report->isSubscriptionExpired()) {
                        PushSubscription::where('endpoint', $endpoint)
                            ->update(['is_active' => false]);
                    }
                }
            }
        } catch (\Throwable $e) {
            // IMPORTANT: no romper el flujo de negocio (ej. marcar asistencia) por fallos de push
            Log::error('Web Push: flush failed', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send a single push notification.
     */
    private static function sendPushNotification(
        \Minishlink\WebPush\WebPush $webPush,
        PushSubscription $subscription,
        string $title,
        string $message,
        ?string $actionUrl = null,
        ?array $data = null
    ): void {
        $payload = null;
        $canEncryptPayload = self::isWebPushEncryptionSupported();

        if ($canEncryptPayload) {
            $payload = json_encode([
                'title' => $title,
                'body' => $message,
                'icon' => url('/pwa-192x192.png'),
                'badge' => url('/pwa-192x192.png'),
                'data' => array_merge($data ?? [], [
                    'url' => $actionUrl ?? url('/'),
                ]),
                'tag' => 'attendance-notification',
                'requireInteraction' => false,
                'renotify' => false,
            ]);
        } else {
            // Fallback: enviar push SIN payload (no requiere cifrado, igual dispara el evento "push")
            Log::warning('Web Push: encryption not supported in this environment; sending push without payload', [
                'subscription_id' => $subscription->id,
            ]);
        }

        // Crear objeto Subscription para web-push
        $pushSubscription = \Minishlink\WebPush\Subscription::create([
            'endpoint' => $subscription->endpoint,
            'keys' => [
                'p256dh' => $subscription->public_key,
                'auth' => $subscription->auth_token,
            ],
            // Requerido por minishlink/web-push v10
            'contentEncoding' => $subscription->content_encoding ?: 'aes128gcm',
        ]);

        // Enviar notificación
        $webPush->queueNotification($pushSubscription, $payload);
    }
}

