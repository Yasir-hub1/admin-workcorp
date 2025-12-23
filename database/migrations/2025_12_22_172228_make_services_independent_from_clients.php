<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Usar DB facade con sintaxis compatible con PostgreSQL y MySQL
        $driver = DB::connection()->getDriverName();

        // SQLite (tests/dev): no soporta ALTER TABLE MODIFY ni DROP NOT NULL fácilmente.
        // Esta migración está pensada para MySQL/PostgreSQL.
        if ($driver === 'sqlite') {
            return;
        }

        Schema::table('services', function (Blueprint $table) {
            // Eliminar la restricción de foreign key de client_id primero
            // (si existe en el driver)
            try {
                $table->dropForeign(['client_id']);
            } catch (\Throwable $e) {
                // ignore
            }
        });

        if ($driver === 'pgsql') {
            // PostgreSQL syntax - usar ALTER COLUMN ... DROP NOT NULL
            DB::statement('ALTER TABLE services ALTER COLUMN client_id DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN start_date DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN end_date DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN contract_duration_months DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN contract_amount DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN payment_frequency DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN status DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN auto_renewal DROP NOT NULL');
            DB::statement('ALTER TABLE services ALTER COLUMN billing_day DROP NOT NULL');
        } else {
            // MySQL/MariaDB syntax
            DB::statement('ALTER TABLE services MODIFY client_id BIGINT UNSIGNED NULL');
            DB::statement('ALTER TABLE services MODIFY start_date DATE NULL');
            DB::statement('ALTER TABLE services MODIFY end_date DATE NULL');
            DB::statement('ALTER TABLE services MODIFY contract_duration_months INT NULL');
            DB::statement('ALTER TABLE services MODIFY contract_amount DECIMAL(15,2) NULL');
            DB::statement('ALTER TABLE services MODIFY payment_frequency ENUM("monthly", "quarterly", "annual", "one_time") NULL');
            DB::statement('ALTER TABLE services MODIFY status ENUM("active", "expiring", "expired", "suspended", "cancelled") NULL');
            DB::statement('ALTER TABLE services MODIFY auto_renewal BOOLEAN NULL');
            DB::statement('ALTER TABLE services MODIFY billing_day INT NULL');
        }

        Schema::table('services', function (Blueprint $table) {
            $table->foreignId('assigned_to')->nullable()->change();
            $table->foreignId('area_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();
        if ($driver === 'sqlite') {
            return;
        }

        Schema::table('services', function (Blueprint $table) {
            // Revertir los cambios
            $table->foreignId('client_id')->nullable(false)->change();
            $table->date('start_date')->nullable(false)->change();
            $table->date('end_date')->nullable(false)->change();
            $table->decimal('contract_amount', 15, 2)->nullable(false)->change();
            $table->enum('payment_frequency', ['monthly', 'quarterly', 'annual', 'one_time'])->nullable(false)->change();

            // Restaurar foreign key
            $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
        });
    }
};
