<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService)
    {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->authService->register($request->validated());
        $token = $this->authService->issueToken($user, $request->userAgent() ?: 'api-client');

        return response()->json([
            'message' => 'Registration successful.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $this->authService->attempt($validated['email'], $validated['password']);
        $token = $this->authService->issueToken($user, $validated['device_name'] ?? ($request->userAgent() ?: 'api-client'));

        return response()->json([
            'message' => 'Login successful.',
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'token_type' => 'Bearer',
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => [
                'user' => new UserResource($request->user()),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logout successful.',
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if (isset($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        }

        $user->update($data);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'data' => [
                'user' => new UserResource($user->refresh()),
            ],
        ]);
    }

    public function updateTheme(Request $request): JsonResponse
    {
        $request->validate([
            'theme_mode' => ['required', 'in:light,dark,system'],
        ]);

        $user = $request->user();
        $user->update(['theme_mode' => $request->theme_mode]);

        return response()->json([
            'message' => 'Theme preference updated.',
            'data' => [
                'user' => new UserResource($user->refresh()),
            ],
        ]);
    }
}
