<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Alinear document_type a lo que usa el sistema (nit, ci, other)
        if (DB::getDriverName() === 'pgsql') {
            // Normalizar valores antiguos (ruc/dni) a nit/ci antes de imponer constraint
            DB::statement("UPDATE clients SET document_type = 'nit' WHERE document_type = 'ruc'");
            DB::statement("UPDATE clients SET document_type = 'ci' WHERE document_type = 'dni'");

            // Quitar el constraint viejo (creado por enum en Laravel) y poner el nuevo
            DB::statement('ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_document_type_check');
            DB::statement("ALTER TABLE clients ADD CONSTRAINT clients_document_type_check CHECK (document_type in ('nit','ci','other'))");
            DB::statement("ALTER TABLE clients ALTER COLUMN document_type SET DEFAULT 'nit'");
        } elseif (DB::getDriverName() === 'mysql') {
            // MySQL: cambiar el enum al set correcto
            DB::statement("ALTER TABLE `clients` MODIFY `document_type` ENUM('nit','ci','other') NOT NULL DEFAULT 'nit'");
            DB::statement("UPDATE `clients` SET `document_type` = 'nit' WHERE `document_type` = 'ruc'");
            DB::statement("UPDATE `clients` SET `document_type` = 'ci' WHERE `document_type` = 'dni'");
        } else {
            // SQLite u otros: no-op (en dev/test suele ser distinto)
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_document_type_check');
            DB::statement("ALTER TABLE clients ADD CONSTRAINT clients_document_type_check CHECK (document_type in ('ruc','dni','other'))");
            DB::statement("ALTER TABLE clients ALTER COLUMN document_type SET DEFAULT 'ruc'");
            DB::statement("UPDATE clients SET document_type = 'ruc' WHERE document_type = 'nit'");
            DB::statement("UPDATE clients SET document_type = 'dni' WHERE document_type = 'ci'");
        } elseif (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `clients` MODIFY `document_type` ENUM('ruc','dni','other') NOT NULL DEFAULT 'ruc'");
            DB::statement("UPDATE `clients` SET `document_type` = 'ruc' WHERE `document_type` = 'nit'");
            DB::statement("UPDATE `clients` SET `document_type` = 'dni' WHERE `document_type` = 'ci'");
        } else {
            // no-op
        }
    }
};


