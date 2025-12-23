<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique()->nullable();
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->decimal('price', 15, 2)->default(0);
            $table->enum('billing_type', ['monthly', 'annual', 'project', 'hourly'])->default('monthly');
            $table->integer('standard_duration')->nullable(); // in days
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('contract_duration_months')->nullable();
            $table->decimal('contract_amount', 15, 2);
            $table->enum('payment_frequency', ['monthly', 'quarterly', 'annual', 'one_time'])->default('monthly');
            $table->enum('status', ['active', 'expiring', 'expired', 'suspended', 'cancelled'])->default('active');
            $table->boolean('auto_renewal')->default(false);
            $table->integer('billing_day')->nullable(); // day of month
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('area_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('sla_response_time')->nullable(); // in hours
            $table->decimal('sla_availability', 5, 2)->nullable(); // percentage
            $table->text('sla_penalties')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};

