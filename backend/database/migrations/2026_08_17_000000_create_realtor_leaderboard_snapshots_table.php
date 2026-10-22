<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('realtor_leaderboard_snapshots', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable()->default(1)->index();
            $table->date('leaderboard_month')->index();
            $table->json('leaderboard');
            $table->unsignedInteger('entries_count')->default(0);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'leaderboard_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('realtor_leaderboard_snapshots');
    }
};
