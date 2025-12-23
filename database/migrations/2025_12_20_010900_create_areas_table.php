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
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique(); // TI, RRHH, VENTAS, etc.
            $table->text('description')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('areas')->onDelete('set null'); // Hierarchical
            $table->foreignId('manager_id')->nullable()->constrained('users')->onDelete('set null'); // Jefe del área
            $table->decimal('budget_monthly', 12, 2)->default(0);
            $table->decimal('budget_annual', 12, 2)->default(0);
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('location')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('code');
            $table->index('parent_id');
            $table->index('manager_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('areas');
    }
};
