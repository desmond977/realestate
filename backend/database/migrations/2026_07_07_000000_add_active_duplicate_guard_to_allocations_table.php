<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql' || ! Schema::hasTable('allocations')) {
            return;
        }

        $duplicates = DB::table('allocations')
            ->select('client_id', 'property_id', DB::raw('COUNT(*) as duplicate_count'))
            ->whereNull('deleted_at')
            ->whereIn('status', ['reserved', 'active', 'completed'])
            ->groupBy('client_id', 'property_id')
            ->having('duplicate_count', '>', 1)
            ->get();

        if ($duplicates->isNotEmpty()) {
            Log::warning('Skipped allocations duplicate guard index because duplicate active allocations already exist.', [
                'duplicates' => $duplicates->map(fn ($row) => [
                    'client_id' => $row->client_id,
                    'property_id' => $row->property_id,
                    'duplicate_count' => $row->duplicate_count,
                ])->values()->all(),
            ]);

            return;
        }

        if (! Schema::hasColumn('allocations', 'active_duplicate_key')) {
            DB::statement("
                ALTER TABLE allocations
                ADD COLUMN active_duplicate_key VARCHAR(64)
                GENERATED ALWAYS AS (
                    CASE
                        WHEN deleted_at IS NULL AND status IN ('reserved', 'active', 'completed')
                        THEN CONCAT(client_id, ':', property_id)
                        ELSE NULL
                    END
                ) STORED
            ");
        }

        if (! $this->indexExists('allocations', 'allocations_active_duplicate_key_unique')) {
            DB::statement('CREATE UNIQUE INDEX allocations_active_duplicate_key_unique ON allocations (active_duplicate_key)');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql' || ! Schema::hasTable('allocations')) {
            return;
        }

        if ($this->indexExists('allocations', 'allocations_active_duplicate_key_unique')) {
            DB::statement('DROP INDEX allocations_active_duplicate_key_unique ON allocations');
        }

        if (Schema::hasColumn('allocations', 'active_duplicate_key')) {
            DB::statement('ALTER TABLE allocations DROP COLUMN active_duplicate_key');
        }
    }

    private function indexExists(string $table, string $index): bool
    {
        return collect(DB::select("SHOW INDEX FROM {$table} WHERE Key_name = ?", [$index]))->isNotEmpty();
    }
};
