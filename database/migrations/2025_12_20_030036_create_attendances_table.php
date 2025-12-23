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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();
            $table->integer('total_minutes')->default(0); // Minutos trabajados
            $table->integer('overtime_minutes')->default(0); // Horas extras
            $table->integer('late_minutes')->default(0); // Minutos de tardanza
            $table->boolean('is_absent')->default(false);
            $table->boolean('is_late')->default(false);
            $table->string('status')->default('pending'); // pending, completed, absent, late
            $table->text('notes')->nullable();
            $table->string('check_in_location')->nullable(); // Para geolocalización
            $table->string('check_out_location')->nullable();
            $table->string('check_in_ip')->nullable();
            $table->string('check_out_ip')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['user_id', 'date']);
            $table->index(['user_id', 'date']);
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
