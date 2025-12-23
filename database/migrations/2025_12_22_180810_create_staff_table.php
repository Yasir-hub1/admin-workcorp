<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->onDelete('set null'); // Relación con User (nullable)
            $table->string('employee_number')->unique()->nullable(); // Número de empleado
            $table->string('document_type')->default('ci'); // ci, nit, passport, other
            $table->string('document_number')->unique();
            $table->date('birth_date')->nullable();
            $table->string('gender')->nullable(); // male, female, other
            $table->string('nationality')->nullable();
            $table->string('phone')->nullable();
            $table->string('mobile')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            
            // Información laboral
            $table->date('hire_date'); // Fecha de ingreso
            $table->date('contract_start_date')->nullable();
            $table->date('contract_end_date')->nullable();
            $table->string('contract_type')->nullable(); // full_time, part_time, contractor, intern
            $table->string('position')->nullable(); // Cargo/Puesto
            $table->foreignId('area_id')->nullable()->constrained('areas')->onDelete('set null');
            $table->text('job_description')->nullable();
            
            // Ubicación GPS (opcional)
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->timestamp('location_updated_at')->nullable();
            
            // Estado
            $table->boolean('is_active')->default(true);
            $table->date('termination_date')->nullable();
            $table->text('termination_reason')->nullable();
            
            // Información adicional
            $table->text('notes')->nullable();
            $table->json('custom_fields')->nullable(); // Campos personalizados adicionales
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index('employee_number');
            $table->index('document_number');
            $table->index('hire_date');
            $table->index('area_id');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
};
