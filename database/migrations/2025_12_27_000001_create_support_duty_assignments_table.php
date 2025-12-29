<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_duty_assignments', function (Blueprint $table) {
            $table->id();
            $table->date('duty_date')->unique(); // Sábado asignado
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade'); // Personal asignado
            $table->string('color')->nullable(); // Color del evento (hex o tailwind token)
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            $table->index(['user_id', 'duty_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_duty_assignments');
    }
};


