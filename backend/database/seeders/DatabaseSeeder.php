<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CompanySetting;
use App\Models\DocumentTemplate;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        \App\Models\Tenant::query()->updateOrCreate(
            ['id' => 1],
            [
                'name' => 'Default Organization',
                'slug' => 'default',
                'is_active' => true,
            ],
        );

        User::query()->updateOrCreate(
            ['email' => 'admin@terraops.com'],
            [
                'name' => 'System Admin',
                'role' => UserRole::Admin,
                'status' => 'active',
                'password' => '1997123@tuTU',
            ],
        );

        CompanySetting::query()->firstOrCreate([], [
            'company_name' => 'Terra Ops',
            'target_type' => 'monthly',
            'target_amount' => 30000000,
        ]);

        collect([
            ['name' => 'Offer Letter', 'slug' => 'offer-letter', 'view_path' => 'documents.templates.offer'],
            ['name' => 'Agreement Letter', 'slug' => 'agreement-letter', 'view_path' => 'documents.templates.agreement'],
            ['name' => 'Processing Letter', 'slug' => 'processing-letter', 'view_path' => 'documents.templates.processing'],
            ['name' => 'Work Initialized Letter', 'slug' => 'work-initialized-letter', 'view_path' => 'documents.templates.work-initialized'],
        ])->each(fn (array $template) => DocumentTemplate::query()->updateOrCreate(
            ['slug' => $template['slug']],
            $template + ['is_active' => true]
        ));
    }
}
