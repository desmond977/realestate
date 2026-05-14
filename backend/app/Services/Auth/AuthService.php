<?php

namespace App\Services\Auth;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * @param array{name: string, email: string, password: string, role?: string} $payload
     */
    public function register(array $payload): User
    {
        return User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'role' => $payload['role'] ?? UserRole::Staff->value,
            'password' => $payload['password'],
        ]);
    }

    /**
     * @throws ValidationException
     */
    public function attempt(string $email, string $password): User
    {
        $user = User::query()->where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        return $user;
    }

    public function issueToken(User $user, string $deviceName = 'api-client'): string
    {
        return $user->createToken($deviceName)->plainTextToken;
    }
}
