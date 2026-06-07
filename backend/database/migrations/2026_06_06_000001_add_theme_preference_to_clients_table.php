<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'theme_mode')) {
                $table->enum('theme_mode', ['light', 'dark', 'system'])->default('system')->after('profile_image');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'theme_mode')) {
                $table->dropColumn('theme_mode');
            }
        });
    }
};