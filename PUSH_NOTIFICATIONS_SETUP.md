# Configuración de Push Notifications

## Instalación de Dependencias

Para que las push notifications funcionen correctamente, necesitas instalar la librería `web-push`:

```bash
composer require minishlink/web-push
```

## Configuración de VAPID Keys

Las credenciales VAPID ya están configuradas en `config/services.php`:

```php
'vapid' => [
    'subject' => 'mailto:yasirarce@kreativabo.com',
    'public_key' => 'BLSyF0ihMaEN_AGFYfIN6mNztJiViEiefGwmnznusI7vBOEO97nH_XVUDOdZq3LWMmLoNlXubFfp6raPDEcaLP4',
    'private_key' => 'n3DDl883Fxd0uLIeWr56L3qX9_ceLMgfDh1TMQui7S4',
],
```

### Variables de Entorno (Opcional)

Si prefieres usar variables de entorno, agrega estas líneas a tu archivo `.env`:

```env
VAPID_SUBJECT=mailto:yasirarce@kreativabo.com
VAPID_PUBLIC_KEY=BLSyF0ihMaEN_AGFYfIN6mNztJiViEiefGwmnznusI7vBOEO97nH_XVUDOdZq3LWMmLoNlXubFfp6raPDEcaLP4
VAPID_PRIVATE_KEY=n3DDl883Fxd0uLIeWr56L3qX9_ceLMgfDh1TMQui7S4
```

Y en el frontend, agrega a tu archivo `.env`:

```env
VITE_VAPID_PUBLIC_KEY=BLSyF0ihMaEN_AGFYfIN6mNztJiViEiefGwmnznusI7vBOEO97nH_XVUDOdZq3LWMmLoNlXubFfp6raPDEcaLP4
```

## Funcionamiento

### Backend

1. **Cuando se marca asistencia** (`AttendanceController::mark()`):
   - Se crea una notificación en la base de datos para jefes de área y super admins
   - Se envían push notifications a todos los usuarios suscritos con esos roles

2. **Datos incluidos en la notificación**:
   - Nombre del personal que marcó
   - Tipo de marcación (Entrada/Salida)
   - Fecha y hora
   - Ubicación
   - Notas (si las hay)

### Frontend

1. **Registro de suscripción**:
   - Se solicita permiso de notificaciones automáticamente
   - Solo para usuarios con rol de jefe de área o super admin
   - La suscripción se guarda en la base de datos

2. **Recepción de notificaciones**:
   - Las notificaciones se reciben incluso si la aplicación está cerrada
   - Al hacer clic, se abre la aplicación y navega a la URL especificada

## Endpoints API

- `POST /api/v1/push-subscriptions` - Registrar suscripción
- `DELETE /api/v1/push-subscriptions` - Eliminar suscripción
- `GET /api/v1/push-subscriptions` - Listar suscripciones del usuario

## Migración de Base de Datos

Ejecuta la migración para crear la tabla de suscripciones:

```bash
php artisan migrate
```

## Pruebas

1. Asegúrate de tener permisos de notificaciones en tu navegador
2. Marca una asistencia como personal
3. Los jefes de área y super admins deberían recibir una notificación push
4. La notificación incluirá todos los datos de la marcación

## Troubleshooting

- Si las notificaciones no se envían, verifica que la librería `web-push` esté instalada
- Verifica que las VAPID keys estén correctamente configuradas
- Revisa los logs de Laravel para ver errores de envío
- Asegúrate de que el Service Worker esté registrado correctamente

