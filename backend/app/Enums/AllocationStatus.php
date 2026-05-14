<?php

namespace App\Enums;

enum AllocationStatus: string
{
    case Active = 'active';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
