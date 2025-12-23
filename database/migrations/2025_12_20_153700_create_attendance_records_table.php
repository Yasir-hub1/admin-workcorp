<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained('attendances')->onDelete('cascade');
            $table->string('type'); // 'check_in' o 'check_out'
            $table->datetime('timestamp'); // Fecha y hora de la marcación
            $table->string('location')->nullable(); // Ubicación (geolocalización)
            $table->string('ip_address')->nullable(); // IP desde donde se marcó
            $table->text('notes')->nullable(); // Notas adicionales
            $table->timestamps();
            $table->softDeletes();

            $table->index(['attendance_id', 'type']);
            $table->index('timestamp');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_records');
    }
};
