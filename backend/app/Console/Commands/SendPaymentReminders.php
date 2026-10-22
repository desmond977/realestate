<?php

namespace App\Console\Commands;

use App\Services\RealEstate\PaymentReminderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SendPaymentReminders extends Command
{
    protected $signature = 'reminders:payment';

    protected $description = 'Send scheduled payment due reminders for upcoming allocation deadlines';

    public function handle(PaymentReminderService $paymentReminderService): int
    {
        $dueReminders = $paymentReminderService->getDueReminders();

        if ($dueReminders->isEmpty()) {
            $this->info('No due payment reminders found.');

            return Command::SUCCESS;
        }

        $this->info("Processing {$dueReminders->count()} due reminders...");

        foreach ($dueReminders as $reminder) {
            DB::transaction(function () use ($reminder, $paymentReminderService) {
                $paymentReminderService->markReminderSent(
                    $reminder['allocation']->id,
                    $reminder['reminder_type']
                );

                \App\Jobs\SendPaymentReminderJob::dispatch(
                    $reminder['allocation']->id,
                    $reminder['reminder_type'],
                    $reminder['days_until_due']
                );
            });
        }

        $this->info('Payment reminders queued successfully.');

        return Command::SUCCESS;
    }
}
