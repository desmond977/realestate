<?php

namespace App\Http\Middleware;

use App\Models\Client;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwnership
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $modelClass, string $parameterName = 'id'): Response
    {
        $user = $request->user();

        if (!$user instanceof Client) {
            return response()->json([
                'message' => 'Access forbidden. Client access required.'
            ], 403);
        }

        $routeParameter = $request->route($parameterName);

        if (!$routeParameter) {
            return response()->json([
                'message' => 'Resource not found.'
            ], 404);
        }

        // If it's already a model instance, check ownership
        if ($routeParameter instanceof $modelClass) {
            $model = $routeParameter;
        } else {
            // Find the model by ID
            $model = $modelClass::find($routeParameter);

            if (!$model) {
                return response()->json([
                    'message' => 'Resource not found.'
                ], 404);
            }
        }

        // Check if the client owns this resource
        $clientId = $user->id;

        // Check various ownership patterns
        $isOwned = false;

        if (isset($model->client_id) && $model->client_id == $clientId) {
            $isOwned = true;
        }

        // For allocations, check through the allocation
        if ($modelClass === \App\Models\Property::class && isset($model->allocation)) {
            if ($model->allocation && $model->allocation->client_id == $clientId) {
                $isOwned = true;
            }
        }

        if (!$isOwned) {
            return response()->json([
                'message' => 'You do not have access to this resource.'
            ], 403);
        }

        return $next($request);
    }
}
