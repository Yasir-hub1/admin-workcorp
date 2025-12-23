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
        Schema::table('users', function (Blueprint $table) {
            // Two-Factor Authentication
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');

            // Profile & Status
            $table->string('profile_photo_path', 2048)->nullable()->after('email_verified_at');
            $table->boolean('is_active')->default(true)->after('profile_photo_path');
            $table->timestamp('last_login_at')->nullable()->after('is_active');
            $table->string('last_login_ip')->nullable()->after('last_login_at');

            // Password Management
            $table->timestamp('password_changed_at')->nullable()->after('password');
            $table->boolean('must_change_password')->default(false)->after('password_changed_at');

            // Localization
            $table->string('language', 10)->default('es')->after('must_change_password');
            $table->string('timezone', 50)->default('America/La_Paz')->after('language');

            // Area Assignment (foreign key will be added in a later migration after areas table is created)
            $table->unsignedBigInteger('area_id')->nullable()->after('timezone');

            // Soft Deletes
            $table->softDeletes();

            // Indexes
            $table->index('email');
            $table->index('is_active');
            $table->index('last_login_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['email']);
            $table->dropIndex(['is_active']);
            $table->dropIndex(['last_login_at']);

            $table->dropSoftDeletes();
            if (Schema::hasColumn('users', 'area_id')) {
                $table->dropForeign(['area_id']);
            }
            $table->dropColumn([
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
                'profile_photo_path',
                'is_active',
                'last_login_at',
                'last_login_ip',
                'password_changed_at',
                'must_change_password',
                'language',
                'timezone',
                'area_id',
            ]);
        });
    }
};
