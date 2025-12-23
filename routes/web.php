<?php

use Illuminate\Support\Facades\Route;

/**
 * SPA Routes - Single Page Application
 *
 * Todas las rutas del frontend (React Router) deben servir la misma vista
 * para que React Router pueda manejar el enrutamiento del lado del cliente.
 *
 * Las rutas de API están en routes/api.php y tienen el prefijo /api/v1
 * Las rutas de API no son capturadas por estas rutas web porque tienen
 * el prefijo /api que las excluye automáticamente.
 */

// Ruta raíz
Route::get('/', function () {
    return view('app');
});

// Rutas específicas del frontend (opcional, para mejor SEO)
Route::get('/login', function () {
    return view('app');
})->name('login');

Route::get('/register', function () {
    return view('app');
})->name('register');

Route::get('/dashboard', function () {
    return view('app');
})->name('dashboard');

// Catch-all para todas las demás rutas del frontend
// IMPORTANTE: Esta ruta debe ir al final para no interferir con las rutas de API
// Esto permite que React Router maneje: /assets, /expenses, /clients, /services, /inventory, etc.
Route::get('/{any}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
