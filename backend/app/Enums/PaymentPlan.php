<?php

namespace App\Enums;

enum PaymentPlan: string
{
    case Full = 'full';
    case Installment = 'installment';
}
