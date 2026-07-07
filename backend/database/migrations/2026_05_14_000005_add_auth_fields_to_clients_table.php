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
        Schema::table('clients', function (Blueprint $table) {
            if (! Schema::hasColumn('clients', 'password')) {
                $table->string('password')->nullable()->after('email');
            }

            if (! Schema::hasColumn('clients', 'profile_image')) {
                $table->string('profile_image')->nullable()->after('password');
            }

            if (! Schema::hasColumn('clients', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable()->after('profile_image');
            }

            if (! Schema::hasColumn('clients', 'remember_token')) {
                $table->rememberToken()->after('profile_image');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            foreach (['password', 'profile_image', 'email_verified_at', 'remember_token'] as $column) {
                if (Schema::hasColumn('clients', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
