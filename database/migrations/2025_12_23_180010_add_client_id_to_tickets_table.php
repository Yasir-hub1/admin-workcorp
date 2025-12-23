<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (!Schema::hasColumn('tickets', 'client_id')) {
                $table->foreignId('client_id')
                    ->nullable()
                    ->after('assigned_to')
                    ->constrained('clients')
                    ->nullOnDelete();
                $table->index('client_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'client_id')) {
                $table->dropConstrainedForeignId('client_id');
            }
        });
    }
};


