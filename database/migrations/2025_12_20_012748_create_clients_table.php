<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('business_name');
            $table->string('legal_name')->nullable();
            $table->enum('document_type', ['ruc', 'dni', 'other'])->default('ruc');
            $table->string('document_number')->unique();
            $table->enum('client_type', ['company', 'individual'])->default('company');
            $table->string('industry')->nullable();
            $table->enum('company_size', ['small', 'medium', 'large'])->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('fiscal_address')->nullable();
            $table->string('website')->nullable();
            $table->date('registration_date')->default(now());
            $table->enum('source', ['referred', 'marketing', 'direct_sale'])->nullable();
            $table->enum('category', ['A', 'B', 'C'])->default('C');
            $table->enum('status', ['active', 'inactive', 'prospect', 'lost'])->default('active');
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('area_id')->nullable()->constrained()->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};

