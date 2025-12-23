# Guía de Pruebas - Push Notifications

## Pasos para Probar Push Notifications

### 1. Preparación

1. **Asegúrate de tener la librería instalada:**
   ```bash
   composer require minishlink/web-push
   ```

2. **Ejecuta las migraciones:**
   ```bash
   php artisan migrate
   ```

3. **Verifica que las VAPID keys estén configuradas** en `config/services.php`

### 2. Configuración del Navegador

1. **Abre la aplicación en el navegador** (Chrome, Firefox, Edge)
2. **Acepta los permisos de notificaciones** cuando el navegador los solicite
3. **Verifica que el Service Worker esté registrado:**
   - Abre DevTools (F12)
   - Ve a Application > Service Workers
   - Debe aparecer un service worker activo

### 3. Prueba de Notificaciones Push

#### Escenario 1: Marcar Asistencia como Personal

1. **Inicia sesión como un usuario con rol "Personal"**
2. **Ve a la página de Asistencias** (`/attendance`)
3. **Marca una entrada o salida:**
   - Haz clic en "Marcar Entrada" o "Marcar Salida"
   - Acepta el permiso de geolocalización si se solicita
   - Agrega notas opcionales
   - Confirma la marcación

#### Escenario 2: Recibir Notificación como Jefe de Área o Super Admin

1. **Inicia sesión como un usuario con rol "Jefe de Área" o "Super Admin"**
2. **Asegúrate de que:**
   - El permiso de notificaciones esté concedido
   - El icono de campana aparezca en la barra superior
   - El contador de notificaciones no leídas se actualice

3. **Cuando otro usuario marque asistencia:**
   - Deberías recibir una notificación push del navegador
   - La notificación debe mostrar:
     - Título: "Entrada - [Nombre del Personal]" o "Salida - [Nombre del Personal]"
     - Mensaje con fecha, hora, ubicación y notas
   - Al hacer clic en la notificación, debe abrir la aplicación y navegar a `/notifications`

#### Escenario 3: Ver Mapa de Ubicación

1. **Ve a la página de Notificaciones** (`/notifications`)
2. **Busca una notificación de tipo "attendance"**
3. **Haz clic en el botón "Ver Mapa"**
4. **Deberías ver:**
   - Un modal con un mapa de OpenStreetMap
   - Un marcador en la ubicación donde se tomó la marcación
   - Las coordenadas (latitud y longitud)
   - Un enlace para abrir en OpenStreetMap

### 4. Verificación en Base de Datos

Puedes verificar que todo esté funcionando correctamente:

```sql
-- Ver notificaciones creadas
SELECT id, user_id, type, title, message, data, created_at 
FROM notifications 
WHERE type = 'attendance' 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver suscripciones push activas
SELECT id, user_id, endpoint, is_active, created_at 
FROM push_subscriptions 
WHERE is_active = true;
```

### 5. Troubleshooting

#### Las notificaciones no aparecen:

1. **Verifica permisos:**
   - Chrome: Configuración > Privacidad y seguridad > Notificaciones
   - Firefox: Configuración > Privacidad y seguridad > Permisos > Notificaciones

2. **Verifica el Service Worker:**
   - DevTools > Application > Service Workers
   - Debe estar "activated and running"

3. **Verifica la consola del navegador:**
   - Busca errores relacionados con push notifications
   - Verifica que la suscripción se haya creado correctamente

4. **Verifica los logs de Laravel:**
   ```bash
   tail -f storage/logs/laravel.log
   ```
   - Busca errores relacionados con web-push

#### El botón "Ver Mapa" no aparece:

1. **Verifica que la notificación sea de tipo "attendance"**
2. **Verifica que `notification.data.location` contenga coordenadas válidas**
3. **Verifica en la consola si hay errores al parsear las coordenadas**

#### Las coordenadas no se muestran correctamente:

1. **Verifica el formato de las coordenadas en la BD:**
   - Debe ser: "lat, lng" (ej: "-17.76609295599019, -63.179582397145865")
2. **Verifica que el campo `data` en la tabla `notifications` sea JSON válido**

### 6. Pruebas Automatizadas (Opcional)

Puedes crear un script de prueba en Tinker:

```php
php artisan tinker

// Crear una notificación de prueba
$user = \App\Models\User::whereHas('roles', function($q) {
    $q->whereIn('name', ['jefe_area', 'super_admin']);
})->first();

\App\Services\NotificationService::create(
    $user->id,
    'attendance',
    'Prueba - Entrada',
    'Prueba marcó Entrada\nFecha: 23/12/2025 10:00:00\nUbicación: -17.76609295599019, -63.179582397145865',
    '/attendance',
    'normal',
    [
        'attendance_id' => 1,
        'record_id' => 1,
        'user_id' => 1,
        'staff_name' => 'Prueba',
        'type' => 'check_in',
        'timestamp' => now()->toISOString(),
        'location' => '-17.76609295599019, -63.179582397145865',
        'notes' => 'Nota de prueba',
    ]
);
```

### 7. Checklist de Verificación

- [ ] La librería `minishlink/web-push` está instalada
- [ ] Las migraciones están ejecutadas
- [ ] Las VAPID keys están configuradas
- [ ] El permiso de notificaciones está concedido
- [ ] El Service Worker está registrado y activo
- [ ] El icono de notificaciones aparece en la barra superior
- [ ] El contador de notificaciones se actualiza correctamente
- [ ] Las notificaciones push aparecen cuando se marca asistencia
- [ ] Al hacer clic en la notificación, navega a `/notifications`
- [ ] El botón "Ver Mapa" aparece en notificaciones de asistencia
- [ ] El mapa muestra correctamente la ubicación de la marcación

