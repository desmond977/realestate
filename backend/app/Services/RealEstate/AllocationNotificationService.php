<?php

namespace App\Services\RealEstate;

use App\Models\Allocation;

class AllocationNotificationService
{
    public function __construct(private readonly EmailNotificationService $emailNotificationService)
    {
    }

    public function sendAllocationCreated(Allocation $allocation): void
    {
        $this->emailNotificationService->sendAllocationCreated($allocation);
    }

    public function sendAllocationUpdated(Allocation $allocation, string $previousStatus, float $previousAmountPaid): void
    {
        $this->emailNotificationService->sendAllocationUpdated($allocation, $previousStatus, $previousAmountPaid);
    }
}
