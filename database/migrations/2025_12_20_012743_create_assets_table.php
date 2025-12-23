<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique()->nullable();
            $table->string('serial_number')->nullable();
            $table->string('category');
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->text('description')->nullable();
            $table->decimal('acquisition_cost', 15, 2);
            $table->date('purchase_date')->nullable();
            $table->string('supplier')->nullable();
            $table->string('invoice_number')->nullable();
            $table->string('purchase_order')->nullable();
            $table->string('payment_method')->nullable();
            $table->decimal('current_value', 15, 2)->nullable();
            $table->integer('useful_life_years')->nullable();
            $table->enum('status', ['available', 'in_use', 'maintenance', 'repair', 'decommissioned'])->default('available');
            $table->foreignId('area_id')->nullable()->constrained()->nullOnDelete();
            $table->string('location')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->date('warranty_start_date')->nullable();
            $table->date('warranty_end_date')->nullable();
            $table->text('warranty_terms')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assets');
    }
};
