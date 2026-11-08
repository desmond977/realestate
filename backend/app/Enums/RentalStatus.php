<?php

namespace App\Enums;

enum RentalStatus: string
{
    // Legacy value retained so existing rows can still be read until the data migration runs.
    case Pending = 'pending';
    case Active = 'active';
    case Expired = 'expired';
    case Terminated = 'terminated';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return array<int, string>
     */
    public static function manageableValues(): array
    {
        return [self::Active->value, self::Expired->value, self::Terminated->value];
    }
}
