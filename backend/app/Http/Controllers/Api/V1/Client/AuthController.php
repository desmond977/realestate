<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private function clientPayload(Client $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'first_name' => $client->first_name,
            'last_name' => $client->last_name,
            'email' => $client->email,
            'phone' => $client->phone,
            'address' => $client->address,
            'occupation' => $client->occupation,
            'role' => 'client',
            'theme_mode' => $client->theme_mode ?? 'system',
            'profile_image_url' => $client->profile_image_url,
            'created_at' => $client->created_at?->toISOString(),
            'email_verified_at' => $client->email_verified_at?->toISOString(),
        ];
    }

    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2);

        return [
            $parts[0] ?? 'Client',
            $parts[1] ?? '',
        ];
    }

    /**
     * Client login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $client = Client::where('email', $request->email)->first();

        if (! $client || ! $client->password || ! Hash::check($request->password, $client->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Create token
        $token = $client->createToken('client-token')->plainTextToken;

        return response()->json([
            'user' => $this->clientPayload($client),
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * Client registration
     */
    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:clients',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'occupation' => 'nullable|string|max:255',
        ]);

        [$firstName, $lastName] = $this->splitName($request->name);

        $client = Client::create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'address' => $request->address,
            'occupation' => $request->occupation,
        ]);

        $token = $client->createToken('client-token')->plainTextToken;

        return response()->json([
            'user' => $this->clientPayload($client),
            'token' => $token,
            'token_type' => 'Bearer',
            'message' => 'Registration successful!'
        ], 201);
    }

    /**
     * Client logout
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Successfully logged out.'
        ]);
    }

    /**
     * Get authenticated client profile
     */
    public function profile(Request $request)
    {
        $client = $request->user();

        return response()->json($this->clientPayload($client));
    }

    /**
     * Public branding for client auth screens.
     */
    public function branding()
    {
        $settings = CompanySetting::query()->first();

        return response()->json([
            'company_name' => $settings?->company_name ?? 'Company',
            'company_logo' => $settings?->company_logo,
            'company_email' => $settings?->company_email,
            'company_phone' => $settings?->company_phone,
            'brand_color' => $settings?->brand_color ?? '#166534',
        ]);
    }
}
