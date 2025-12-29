<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Programar recordatorios de reuniones cada 5 minutos
Schedule::command('meetings:send-reminders')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// Programar recordatorios de tickets cada 10 minutos
Schedule::command('tickets:send-reminders')
    ->everyTenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

// Programar recordatorios de solicitudes (cada hora)
Schedule::command('requests:send-reminders')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

// Programar recordatorios de gastos (cada hora)
Schedule::command('expenses:send-reminders')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();

// Programar recordatorios de salida (check-out) (cada 15 minutos)
Schedule::command('attendance:send-checkout-reminders')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('support-calendar:send-reminders')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('support-calendar:send-reminders')
    ->dailyAt('18:00')
    ->withoutOverlapping()
    ->runInBackground();

// Recordatorios de vencimiento de servicios (1 y 7 días antes) - 09:00 y 18:00
Schedule::command('services:send-expiry-reminders')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->runInBackground();

Schedule::command('services:send-expiry-reminders')
    ->dailyAt('18:00')
    ->withoutOverlapping()
    ->runInBackground();
