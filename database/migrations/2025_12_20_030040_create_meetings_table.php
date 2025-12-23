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
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('location')->nullable();
            $table->string('meeting_type')->default('internal'); // internal, external, client
            $table->foreignId('organizer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('area_id')->nullable()->constrained()->onDelete('set null');
            $table->json('attendees'); // Array de user_ids
            $table->text('agenda')->nullable();
            $table->text('notes')->nullable();
            $table->text('attachments')->nullable(); // JSON array
            $table->string('status')->default('scheduled'); // scheduled, in_progress, completed, cancelled
            $table->text('meeting_link')->nullable(); // Para videollamadas
            $table->boolean('send_reminders')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organizer_id', 'start_time']);
            $table->index('start_time');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};
