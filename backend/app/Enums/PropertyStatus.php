<?php

namespace App\Enums;

enum PropertyStatus: string
{
    case Available = 'available';
    case Reserved = 'reserved';
    case Sold = 'sold';
}
