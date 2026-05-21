<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CompanySetting;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'System Admin',
                'role' => UserRole::Admin,
                'password' => 'Password1',
            ],
        );

        CompanySetting::query()->firstOrCreate([], [
            'company_name' => 'EstateOps',
            'target_type' => 'monthly',
            'target_amount' => 250000,
        ]);
    }
}
