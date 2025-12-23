<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_salaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('staff')->onDelete('cascade');
            $table->decimal('amount', 12, 2); // Monto del sueldo
            $table->string('currency', 3)->default('USD'); // Moneda
            $table->date('effective_date'); // Fecha desde la cual es efectivo
            $table->date('end_date')->nullable(); // Fecha hasta la cual fue efectivo (null = actual)
            $table->string('salary_type')->default('monthly'); // monthly, biweekly, weekly, annual
            $table->text('notes')->nullable(); // Notas sobre el cambio de sueldo
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->boolean('is_active')->default(true); // Si es el sueldo actual
            $table->timestamps();
            
            // Indexes
            $table->index('staff_id');
            $table->index('effective_date');
            $table->index('is_active');
            $table->index(['staff_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_salaries');
    }
};
