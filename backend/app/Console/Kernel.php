<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        $schedule->command('reminders:monthly')
            ->monthlyOn(1, '09:00')
            ->emailOutputOnFailure(config('mail.from.address'))
            ->withoutOverlapping();

        $schedule->command('reminders:payment')
            ->dailyAt('08:00')
            ->emailOutputOnFailure(config('mail.from.address'))
            ->withoutOverlapping();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
