<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->enum('theme_mode', ['light', 'dark', 'system'])->default('system')->after('target_amount');
            $table->string('brand_color', 7)->default('#166534')->after('theme_mode');
        });
    }

    public function down(): void
    {
        Schema::table('company_settings', function (Blueprint $table) {
            $table->dropColumn(['theme_mode', 'brand_color']);
        });
    }
};
