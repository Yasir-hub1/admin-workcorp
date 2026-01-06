# WorkCorp Admin - Sistema de Gestión Empresarial

Sistema integral de gestión empresarial desarrollado con Laravel 12 y React 19, diseñado para administrar clientes, servicios, inventario, personal, asistencias, tickets de soporte y más.

## Características Principales

- Gestión de clientes y servicios
- Control de inventario y activos
- Sistema de tickets de soporte
- Gestión de asistencias del personal
- Sistema de permisos basado en roles
- Notificaciones push (Web Push)
- PWA (Progressive Web App) con soporte offline
- Reportes y estadísticas en tiempo real
- Sistema de aprobación de gastos
- Calendario de turnos de soporte
- Sistema de notas y comunicaciones internas

## Stack Tecnológico

### Backend
- **PHP**: 8.2+
- **Framework**: Laravel 12
- **Base de Datos**: PostgreSQL 14+
- **Autenticación**: Laravel Sanctum
- **Broadcasting**: Pusher
- **Queue**: Database driver
- **Cache**: Database driver

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 7
- **Router**: React Router DOM 7
- **Estado**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **UI Components**: Headless UI, Heroicons
- **Estilos**: Tailwind CSS 4
- **Formularios**: React Hook Form
- **Notificaciones**: React Hot Toast
- **Mapas**: Leaflet + React Leaflet
- **Gráficos**: Recharts
- **Animaciones**: Framer Motion

### Características Adicionales
- **PWA**: Vite Plugin PWA con Service Workers
- **Push Notifications**: Web Push API (minishlink/web-push)
- **Excel**: Maatwebsite Excel
- **PDF**: DomPDF
- **Activity Log**: Spatie Activity Log

---

## Requisitos del Sistema

### Servidor de Producción
- Ubuntu 20.04 LTS o superior (recomendado) / Debian 11+
- PHP 8.3 o superior con extensiones:
  - BCMath
  - Ctype
  - cURL
  - DOM
  - Fileinfo
  - JSON
  - Mbstring
  - OpenSSL
  - PCRE
  - PDO
  - pgsql (PostgreSQL driver)
  - pdo_pgsql
  - Tokenizer
  - XML
  - GD o Imagick (para generación de imágenes PWA)
- PostgreSQL 14+
- Nginx 1.18+
- Composer 2.x
- Node.js 18+ y npm 9+
- Supervisor (para queue workers)
- SSL Certificate (Let's Encrypt recomendado)

### Desarrollo Local
- PHP 8.3+
- PostgreSQL 14+
- Composer 2.x
- Node.js 18+ y npm 9+

---

## Instalación en Desarrollo

### 1. Clonar el repositorio

```bash
git clone <repository-url> admin-workcorp
cd admin-workcorp
```

### 2. Instalar dependencias de PHP

```bash
composer install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones locales:

```env
APP_NAME="WorkCorp Admin"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=admin_workcorp
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_password

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

# Pusher (opcional para desarrollo)
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=

# Web Push (generar con php artisan webpush:vapid)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:tu@email.com
```

### 4. Generar application key

```bash
php artisan key:generate
```

### 5. Crear la base de datos

```bash
createdb admin_workcorp -U tu_usuario
# O usando psql:
# psql -U postgres
# CREATE DATABASE admin_workcorp;
```

### 6. Ejecutar migraciones

```bash
php artisan migrate
```

### 7. (Opcional) Ejecutar seeders

```bash
php artisan db:seed
```

### 8. Crear enlace simbólico de storage

```bash
php artisan storage:link
```

### 9. Generar claves VAPID para Web Push

```bash
php artisan webpush:vapid
```

Copia las claves generadas a tu archivo `.env`.

### 10. Instalar dependencias de Node

```bash
npm install
```

### 11. Iniciar el servidor de desarrollo

```bash
composer dev
# O manualmente:
# Terminal 1: php artisan serve
# Terminal 2: php artisan queue:listen
# Terminal 3: npm run dev
```

La aplicación estará disponible en `http://localhost:8000`

---

## Despliegue en Producción

### Servidor: `https://admin.solucionesinteligentes.pro`

### 1. Preparar el servidor

#### Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

#### Instalar PHP 8.3 y extensiones

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php
sudo apt update
sudo apt install -y php8.3-fpm php8.3-cli php8.3-common php8.3-pgsql \
  php8.3-curl php8.3-mbstring php8.3-xml php8.3-bcmath php8.3-zip \
  php8.3-gd php8.3-intl php8.3-readline
```

#### Instalar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

#### Instalar Node.js 18+

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

#### Instalar Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
```

#### Instalar Supervisor

```bash
sudo apt install -y supervisor
sudo systemctl enable supervisor
sudo systemctl start supervisor
```

### 2. Configurar PostgreSQL

```bash
sudo -u postgres psql
```

Dentro de psql:

```sql
CREATE DATABASE admin_workcorp;
CREATE USER workcorp_user WITH ENCRYPTED PASSWORD 'TU_PASSWORD_SEGURO';
GRANT ALL PRIVILEGES ON DATABASE admin_workcorp TO workcorp_user;
\q
```

### 3. Clonar y configurar la aplicación

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www/admin.solucionesinteligentes.pro
sudo chown -R $USER:$USER /var/www/admin.solucionesinteligentes.pro

# Clonar repositorio
cd /var/www/admin.solucionesinteligentes.pro
git clone <repository-url> .

# Instalar dependencias
composer install --optimize-autoloader --no-dev

# Configurar permisos
sudo chown -R www-data:www-data /var/www/admin.solucionesinteligentes.pro
sudo chmod -R 755 /var/www/admin.solucionesinteligentes.pro
sudo chmod -R 775 /var/www/admin.solucionesinteligentes.pro/storage
sudo chmod -R 775 /var/www/admin.solucionesinteligentes.pro/bootstrap/cache
```

### 4. Configurar variables de entorno de producción

```bash
cp .env.example .env
nano .env
```

Configuración de producción `.env`:

```env
APP_NAME="WorkCorp Admin"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://admin.solucionesinteligentes.pro

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=admin_workcorp
DB_USERNAME=workcorp_user
DB_PASSWORD=TU_PASSWORD_SEGURO

QUEUE_CONNECTION=database
CACHE_STORE=database
SESSION_DRIVER=database

BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=tu_app_id
PUSHER_APP_KEY=tu_app_key
PUSHER_APP_SECRET=tu_app_secret
PUSHER_APP_CLUSTER=us2

VAPID_PUBLIC_KEY=tu_vapid_public_key
VAPID_PRIVATE_KEY=tu_vapid_private_key
VAPID_SUBJECT=mailto:admin@solucionesinteligentes.pro

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error

# Session
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_DOMAIN=.solucionesinteligentes.pro
```

### 5. Configurar la aplicación

```bash
# Generar application key
php artisan key:generate

# Generar VAPID keys si no las tienes
php artisan webpush:vapid

# Crear enlace simbólico
php artisan storage:link

# Ejecutar migraciones
php artisan migrate --force

# (Opcional) Ejecutar seeders
php artisan db:seed --force

# Optimizar para producción
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### 6. Compilar assets de frontend

```bash
npm install
npm run build
```

### 7. Configurar Nginx (SIN SSL - se configurará después)

Crear configuración específica para el subdominio:

```bash
sudo nano /etc/nginx/sites-available/admin.solucionesinteligentes.pro
```

**IMPORTANTE**: Esta configuración inicial es sin SSL. Certbot agregará automáticamente la configuración SSL en el paso 8.

Contenido del archivo:

```nginx
# WorkCorp Admin - admin.solucionesinteligentes.pro
# Configuración inicial sin SSL (Certbot la modificará automáticamente)

upstream admin_workcorp_php {
    server unix:/var/run/php/php8.3-fpm.sock;
}

server {
    listen 80;
    listen [::]:80;
    server_name admin.solucionesinteligentes.pro;

    # Root directory
    root /var/www/admin.solucionesinteligentes.pro/public;
    index index.php index.html;

    # Logging
    access_log /var/log/nginx/admin.solucionesinteligentes.pro-access.log;
    error_log /var/log/nginx/admin.solucionesinteligentes.pro-error.log;

    # Security headers (Certbot añadirá HSTS después)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Character encoding
    charset utf-8;

    # Max upload size
    client_max_body_size 50M;

    # Disable access log for static assets (performance)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # Service Worker - CRITICAL for PWA - NO CACHE
    location = /sw.js {
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        add_header Service-Worker-Allowed "/";
        add_header Content-Type "application/javascript";
        expires off;
        etag off;
        try_files $uri =404;
    }

    # PWA Manifest - Cache for 1 week
    location = /manifest.webmanifest {
        add_header Cache-Control "public, max-age=604800";
        default_type application/manifest+json;
        try_files $uri =404;
    }

    # PWA Icons
    location ~* ^/pwa-.*\.(png|svg)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Main location block
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM configuration
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_pass admin_workcorp_php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;

        # Increase timeouts for long-running requests
        fastcgi_read_timeout 300;
        fastcgi_send_timeout 300;
        fastcgi_connect_timeout 300;

        # Buffer settings
        fastcgi_buffer_size 128k;
        fastcgi_buffers 256 16k;
        fastcgi_busy_buffers_size 256k;
        fastcgi_temp_file_write_size 256k;
    }

    # Deny access to hidden files (except .well-known for Let's Encrypt)
    location ~ /\.(?!well-known).* {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Prevent access to sensitive directories
    location ~ ^/(storage|vendor|database|tests|node_modules|\.git) {
        deny all;
        return 404;
    }

    # robots.txt
    location = /robots.txt {
        access_log off;
        log_not_found off;
    }

    # favicon.ico
    location = /favicon.ico {
        access_log off;
        log_not_found off;
    }
}
```

Activar el sitio:

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/admin.solucionesinteligentes.pro /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Si todo está OK, recargar Nginx
sudo systemctl reload nginx
```

### 8. Configurar SSL con Let's Encrypt

**IMPORTANTE**: Certbot modificará automáticamente tu archivo de configuración de Nginx para agregar SSL y redirección HTTPS.

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL (Certbot modificará automáticamente la config de Nginx)
sudo certbot --nginx -d admin.solucionesinteligentes.pro

# Durante la instalación, Certbot preguntará:
# - Email para renovaciones
# - Aceptar términos de servicio
# - Compartir email (opcional)
# - Redirect HTTP to HTTPS? Seleccionar: 2 (Redirect)

# Verificar renovación automática (ya configurada por defecto)
sudo certbot renew --dry-run

# Ver certificados instalados
sudo certbot certificates
```

Después de ejecutar Certbot, tu configuración de Nginx será automáticamente actualizada con:
- Certificados SSL
- Redirección HTTP → HTTPS
- Headers de seguridad HSTS
- Configuración SSL optimizada

### 9. Configurar Supervisor para Queue Workers

```bash
sudo nano /etc/supervisor/conf.d/workcorp-queue.conf
```

Contenido:

```ini
[program:workcorp-queue-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/admin_corp/artisan queue:work database --sleep=3 --tries=3 --max-time=3600 --timeout=300
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/admin_corp/storage/logs/queue-worker.log
stopwaitsecs=3600
```

Activar el worker:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start workcorp-queue-worker:*
sudo supervisorctl status
```

### 10. Configurar Cron para Laravel Scheduler (Opcional)

```bash
sudo crontab -e -u www-data
```

Agregar:

```cron
* * * * * cd /var/www/admin.solucionesinteligentes.pro && php artisan schedule:run >> /dev/null 2>&1
```

### 11. Optimizaciones de PHP-FPM

```bash
sudo nano /etc/php/8.3/fpm/pool.d/www.conf
```

Configuraciones recomendadas:

```ini
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500

; Increase timeouts
request_terminate_timeout = 300
```

También editar `/etc/php/8.3/fpm/php.ini` para ajustes de memoria:

```bash
sudo nano /etc/php/8.3/fpm/php.ini
```

Configuraciones recomendadas:

```ini
memory_limit = 256M
upload_max_filesize = 50M
post_max_size = 50M
max_execution_time = 300
max_input_time = 300
```

Reiniciar PHP-FPM:

```bash
sudo systemctl restart php8.3-fpm
```

### 12. Optimizaciones de PostgreSQL

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

Ajustes recomendados (según recursos del servidor):

```conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

Reiniciar PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Actualización en Producción

Script para actualizaciones sin downtime:

```bash
#!/bin/bash
# deploy.sh

cd /var/www/admin.solucionesinteligentes.pro

# Modo mantenimiento
php artisan down

# Pull últimos cambios
git pull origin main

# Actualizar dependencias
composer install --optimize-autoloader --no-dev
npm install
npm run build

# Ejecutar migraciones
php artisan migrate --force

# Limpiar y reconstruir cachés
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Reiniciar queue workers
sudo supervisorctl restart workcorp-queue-worker:*

# Salir de modo mantenimiento
php artisan up

echo "Despliegue completado exitosamente!"
```

Dar permisos de ejecución:

```bash
chmod +x deploy.sh
```

---

## Monitoreo y Logs

### Ver logs de Laravel

```bash
tail -f /var/www/admin.solucionesinteligentes.pro/storage/logs/laravel.log
```

### Ver logs de Nginx

```bash
# Access log
tail -f /var/log/nginx/admin.solucionesinteligentes.pro-access.log

# Error log
tail -f /var/log/nginx/admin.solucionesinteligentes.pro-error.log
```

### Ver logs de Queue Workers

```bash
tail -f /var/www/admin.solucionesinteligentes.pro/storage/logs/queue-worker.log
```

### Monitorear queue jobs

```bash
php artisan queue:monitor
```

---

## Troubleshooting

### Error: "Permission denied" en storage

```bash
sudo chown -R www-data:www-data /var/www/admin.solucionesinteligentes.pro/storage
sudo chmod -R 775 /var/www/admin.solucionesinteligentes.pro/storage
```

### Error: "No application encryption key has been specified"

```bash
php artisan key:generate
```

### Queue workers no procesan jobs

```bash
# Reiniciar workers
sudo supervisorctl restart workcorp-queue-worker:*

# Verificar status
sudo supervisorctl status

# Ver logs
tail -f /var/www/admin.solucionesinteligentes.pro/storage/logs/queue-worker.log
```

### Error 500 después de actualizar

```bash
# Limpiar todos los cachés
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Regenerar
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### La PWA no se actualiza

```bash
# Limpiar cache del navegador
# O incrementar versión en el manifest (vite.config.js)

# Reconstruir assets
npm run build
```

### Pusher no funciona

Verificar:
1. Credenciales correctas en `.env`
2. Laravel Echo está inicializado en `resources/js/bootstrap.js`
3. Pusher está configurado en `config/broadcasting.php`

### PostgreSQL connection refused

```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Verificar credenciales en .env
# Verificar que el usuario tiene permisos
sudo -u postgres psql
\du
\l
```

---

## Seguridad

### Firewall (UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5432/tcp  # Solo si PostgreSQL está en otro servidor
sudo ufw enable
```

### Fail2Ban para Nginx

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Backup de Base de Datos

Script automático:

```bash
#!/bin/bash
# backup-db.sh

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/admin-workcorp"
DB_NAME="admin_workcorp"
DB_USER="workcorp_user"

mkdir -p $BACKUP_DIR

pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Mantener solo los últimos 30 días
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completado: backup_$TIMESTAMP.sql.gz"
```

Agregar a crontab:

```bash
sudo crontab -e
```

```cron
# Backup diario a las 2 AM
0 2 * * * /path/to/backup-db.sh
```

---

## Comandos Útiles

```bash
# Ver estado de la aplicación
php artisan about

# Limpiar todos los cachés
php artisan optimize:clear

# Optimizar todo para producción
php artisan optimize

# Ver lista de rutas
php artisan route:list

# Ver queue jobs pendientes
php artisan queue:monitor

# Ejecutar queue worker manualmente
php artisan queue:work --tries=3

# Ver logs en tiempo real
php artisan pail

# Generar reporte de actividades
php artisan activity:clean

# Verificar configuración
php artisan config:show database
```

---

## Contribución

Este es un proyecto privado. Para contribuir, contactar al administrador del sistema.

---

## Licencia

Propietario: Soluciones Inteligentes
Todos los derechos reservados.

---

## Soporte

Para soporte técnico, contactar a: admin@solucionesinteligentes.pro

---

**Última actualización**: 2025-12-31
