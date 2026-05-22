<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('realtors', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('phone')->nullable()->index();
            $table->string('email')->nullable()->unique();
            $table->text('address')->nullable();
            $table->string('company_name')->nullable();
            $table->longText('profile_image')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('realtors');
    }
};
