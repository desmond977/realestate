<?php

namespace App\Console\Commands;

use App\Services\RealEstate\EmailNotificationService;
use Illuminate\Console\Command;

class SendMonthlyClientReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reminders:monthly';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send monthly reminder emails to all clients with active allocations';

    /**
     * Execute the console command.
     */
    public function handle(EmailNotificationService $emailNotificationService): int
    {
        $this->info('Starting monthly client reminder process...');

        $emailNotificationService->sendMonthlyRemindersToAllClients();

        $this->info('Monthly client reminders sent successfully.');

        return Command::SUCCESS;
    }
}
