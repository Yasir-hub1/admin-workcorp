<?php

namespace App\Http\Controllers\Api\V1\PushSubscriptions;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

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

        // Buscar si ya existe una suscripción con este endpoint
        $subscription = PushSubscription::where('endpoint', $request->endpoint)->first();

        if ($subscription) {
            // Actualizar si pertenece al mismo usuario
            if ($subscription->user_id === $user->id) {
                $subscription->update([
                    'public_key' => $request->keys['p256dh'],
                    'auth_token' => $request->keys['auth'],
                    // Minishlink/web-push v10 requiere contentEncoding. En navegadores modernos es aes128gcm.
                    'content_encoding' => 'aes128gcm',
                    'user_agent' => $request->userAgent(),
                    'is_active' => true,
                ]);
            } else {
                // Si pertenece a otro usuario, crear una nueva
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
            }
        } else {
            // Crear nueva suscripción
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
        }

        Log::info('Push Subscription: Subscription saved', [
            'subscription_id' => $subscription->id,
            'user_id' => $subscription->user_id,
            'is_active' => $subscription->is_active,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Suscripción registrada correctamente',
            'data' => $subscription,
        ], 201);
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
