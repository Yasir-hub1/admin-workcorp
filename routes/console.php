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
