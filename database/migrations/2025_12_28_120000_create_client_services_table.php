<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_services', function (Blueprint $table) {
            $table->id();

            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->restrictOnDelete();

            // Contrato / compra (kardex)
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->integer('contract_duration_months')->nullable();
            $table->decimal('contract_amount', 15, 2)->nullable();
            $table->enum('payment_frequency', ['monthly', 'quarterly', 'annual', 'one_time'])->default('monthly');
            $table->enum('status', ['active', 'expiring', 'expired', 'suspended', 'cancelled'])->default('active');
            $table->boolean('auto_renewal')->default(false);
            $table->integer('billing_day')->nullable();

            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('area_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['client_id', 'service_id']);
            $table->index(['end_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_services');
    }
};


