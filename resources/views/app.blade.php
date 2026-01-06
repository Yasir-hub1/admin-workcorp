<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

  <title>Admin Workcorp</title>
  <meta name="description" content="PWA con Laravel + React">

  <!-- PWA Meta Tags -->
  <meta name="theme-color" content="#ffffff">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="MiPWA">

  <!-- PWA Icons -->
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico">
  <link rel="apple-touch-icon" sizes="192x192" href="/pwa-192x192.png">
  <link rel="apple-touch-icon" sizes="512x512" href="/pwa-512x512.png">

  @viteReactRefresh
  @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body>
  <div id="app"></div>
</body>
</html>
