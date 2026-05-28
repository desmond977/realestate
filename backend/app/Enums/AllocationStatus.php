<?php

namespace App\Enums;

enum AllocationStatus: string
{
    case Reserved = 'reserved';
    case Active = 'active';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
