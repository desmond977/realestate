<?php

namespace App\Services\Paystack;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class PaystackClient
{
    public function configured(): bool
    {
        $key = (string) config('services.paystack.secret_key');
        $mode = config('services.paystack.mode') === 'live' ? 'live' : 'test';
        return $mode === 'live' ? str_starts_with($key, 'sk_live_') : str_starts_with($key, 'sk_test_');
    }

    private function request()
    {
        if (! $this->configured()) throw new RuntimeException('Paystack payments are not configured yet.');
        return Http::acceptJson()->asJson()->withToken(config('services.paystack.secret_key'))
            ->timeout((int) config('services.paystack.timeout', 20))->baseUrl('https://api.paystack.co');
    }

    public function initialize(array $data): array
    {
        $response = $this->request()->post('/transaction/initialize', $data);
        if (! $response->successful() || ! $response->json('status')) throw new RuntimeException('Paystack could not initialize checkout.');
        $result = $response->json('data');
        $url = $result['authorization_url'] ?? '';
        if (! is_string($url) || ! str_starts_with($url, 'https://checkout.paystack.com/')) throw new RuntimeException('Paystack returned an invalid checkout URL.');
        return $result;
    }

    public function verify(string $reference): array
    {
        $response = $this->request()->get('/transaction/verify/'.rawurlencode($reference));
        if (! $response->successful() || ! $response->json('status')) throw new RuntimeException('Paystack transaction verification is temporarily unavailable.');
        return $response->json('data') ?? [];
    }

    public function validWebhookSignature(string $body, ?string $signature, ?string $legacySignature): bool
    {
        if (is_string($legacySignature) && filled(config('services.paystack.secret_key')) && hash_equals(hash_hmac('sha512', $body, (string) config('services.paystack.secret_key')), $legacySignature)) return true;
        if (! is_string($signature) || ! filled(config('services.paystack.webhook_secret'))) return false;
        $timestamp = null; $signatures = [];
        foreach (explode(',', $signature) as $part) {
            $pair = explode('=', trim($part), 2);
            if (count($pair) !== 2) continue;
            if ($pair[0] === 't') $timestamp = $pair[1];
            if ($pair[0] === 'v1') { $sig = explode(':', $pair[1], 2); if (count($sig) === 2) $signatures[] = $sig[1]; }
        }
        if (! ctype_digit((string) $timestamp) || abs(time() - (int) $timestamp) > 300) return false;
        $expected = hash_hmac('sha512', $timestamp.'.'.$body, (string) config('services.paystack.webhook_secret'));
        foreach ($signatures as $candidate) if (preg_match('/^[a-f0-9]{128}$/', $candidate) && hash_equals($expected, $candidate)) return true;
        return false;
    }
}
