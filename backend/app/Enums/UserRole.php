<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Staff = 'staff';
    case Accountant = 'accountant';

    public function canViewProperties(): bool
    {
        return in_array($this, [self::Admin, self::Accountant], true);
    }

    public function canManageProperties(): bool
    {
        return $this === self::Admin;
    }

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
