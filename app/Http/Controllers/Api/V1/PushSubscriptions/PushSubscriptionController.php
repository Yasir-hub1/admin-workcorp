<?php

namespace App\Http\Controllers\Api\V1\PushSubscriptions;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Database\UniqueConstraintViolationException;

class PushSubscriptionController extends Controller
{
    /**
     * Register a push subscription.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|url|max:500',
            'keys' => 'required|array',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();

        Log::info('Push Subscription: Registering subscription', [
            'user_id' => $user->id,
            'endpoint' => substr($request->endpoint, 0, 50) . '...',
            'has_keys' => !empty($request->keys['p256dh']) && !empty($request->keys['auth']),
        ]);

        // Endpoint es UNIQUE. Si el mismo navegador re-loguea con otro usuario, debemos "transferir"
        // la suscripción (actualizar user_id) en vez de intentar crear una nueva fila.
        try {
            $subscription = PushSubscription::where('endpoint', $request->endpoint)->first();
            $wasCreated = false;
            $previousUserId = $subscription?->user_id;

            if ($subscription) {
                $subscription->update([
                    'user_id' => $user->id,
                    'public_key' => $request->keys['p256dh'],
                    'auth_token' => $request->keys['auth'],
                    // Minishlink/web-push v10 requiere contentEncoding. En navegadores modernos es aes128gcm.
                    'content_encoding' => 'aes128gcm',
                    'user_agent' => $request->userAgent(),
                    'is_active' => true,
                ]);
            } else {
                $subscription = PushSubscription::create([
                    'user_id' => $user->id,
                    'endpoint' => $request->endpoint,
                    'public_key' => $request->keys['p256dh'],
                    'auth_token' => $request->keys['auth'],
                    // Minishlink/web-push v10 requiere contentEncoding. En navegadores modernos es aes128gcm.
                    'content_encoding' => 'aes128gcm',
                    'user_agent' => $request->userAgent(),
                    'is_active' => true,
                ]);
                $wasCreated = true;
            }

            Log::info('Push Subscription: Subscription upserted', [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
                'previous_user_id' => $previousUserId,
                'was_created' => $wasCreated,
                'is_active' => $subscription->is_active,
            ]);

            return response()->json([
                'success' => true,
                'message' => $wasCreated ? 'Suscripción registrada correctamente' : 'Suscripción actualizada correctamente',
                'data' => $subscription,
            ], $wasCreated ? 201 : 200);
        } catch (UniqueConstraintViolationException $e) {
            // Carreras: dos requests simultáneos pueden intentar insertar el mismo endpoint.
            // En ese caso, cargamos y actualizamos la fila existente.
            Log::warning('Push Subscription: Unique constraint hit, retrying as update', [
                'user_id' => $user->id,
                'endpoint' => substr($request->endpoint, 0, 50) . '...',
            ]);

            $subscription = PushSubscription::where('endpoint', $request->endpoint)->first();
            if ($subscription) {
                $subscription->update([
                    'user_id' => $user->id,
                    'public_key' => $request->keys['p256dh'],
                    'auth_token' => $request->keys['auth'],
                    'content_encoding' => 'aes128gcm',
                    'user_agent' => $request->userAgent(),
                    'is_active' => true,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Suscripción actualizada correctamente',
                'data' => $subscription,
            ], 200);
        }

        // unreachable
    }

    /**
     * Remove a push subscription.
     */
    public function destroy(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'endpoint' => 'required|url|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();

        $subscription = PushSubscription::where('endpoint', $request->endpoint)
            ->where('user_id', $user->id)
            ->first();

        if ($subscription) {
            $subscription->update(['is_active' => false]);
            // Opcional: eliminar completamente
            // $subscription->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Suscripción eliminada correctamente',
        ]);
    }

    /**
     * Get user's push subscriptions.
     */
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $subscriptions = PushSubscription::where('user_id', $user->id)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'success' => true,
            'data' => $subscriptions,
        ]);
    }
}
