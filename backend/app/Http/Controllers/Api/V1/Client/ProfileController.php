<?php

namespace App\Http\Controllers\Api\V1\Client;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    private function clientPayload($client): array
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
            'profile_image_url' => $client->profile_image_url,
            'role' => 'client',
            'email_verified_at' => $client->email_verified_at?->toISOString(),
            'created_at' => $client->created_at?->toISOString(),
        ];
    }

    /**
     * Get client profile
     */
    public function show(Request $request)
    {
        $client = $request->user();

        return response()->json($this->clientPayload($client));
    }

    /**
     * Update client profile
     */
    public function update(Request $request)
    {
        $client = $request->user();

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
            'occupation' => 'nullable|string|max:255',
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('clients')->ignore($client->id),
            ],
        ]);

        if (isset($validated['name'])) {
            $parts = preg_split('/\s+/', trim($validated['name']), 2);
            $validated['first_name'] = $parts[0] ?? $client->first_name;
            $validated['last_name'] = $parts[1] ?? '';
            unset($validated['name']);
        }

        $client->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $this->clientPayload($client->fresh()),
        ]);
    }

    /**
     * Update password
     */
    public function updatePassword(Request $request)
    {
        $client = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $client->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.'
            ], 422);
        }

        $client->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Password updated successfully.',
        ]);
    }

    /**
     * Update profile image
     */
    public function updateProfileImage(Request $request)
    {
        $request->validate([
            'profile_image' => 'required|image|max:2048',
        ]);

        $client = $request->user();

        if ($client->profile_image) {
            Storage::disk('public')->delete($client->profile_image);
        }

        $path = $request->file('profile_image')->store('profile-images', 'public');

        $client->update([
            'profile_image' => $path,
        ]);

        return response()->json([
            'message' => 'Profile image updated successfully.',
            'profile_image_url' => $client->profile_image_url,
        ]);
    }

    /**
     * Delete profile image
     */
    public function deleteProfileImage(Request $request)
    {
        $client = $request->user();

        if ($client->profile_image) {
            Storage::disk('public')->delete($client->profile_image);
            $client->update(['profile_image' => null]);
        }

        return response()->json([
            'message' => 'Profile image deleted successfully.',
        ]);
    }
}
