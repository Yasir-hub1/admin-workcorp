<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('area_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('area_id')->constrained('areas')->onDelete('cascade');
            $table->foreignId('staff_id')->constrained('staff')->onDelete('cascade');
            $table->boolean('is_manager')->default(false); // Si es jefe de área
            $table->date('assigned_at')->default(now());
            $table->date('unassigned_at')->nullable();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            
            // Indexes
            $table->unique(['area_id', 'staff_id', 'is_manager']);
            $table->index('area_id');
            $table->index('staff_id');
            $table->index('is_manager');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('area_staff');
    }
};
