<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureEmploymentActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $user->loadMissing('staff');

        if (method_exists($user, 'canAuthenticate') && ! $user->canAuthenticate()) {
            $user->currentAccessToken()?->delete();

            return response()->json([
                'success' => false,
                'message' => 'Tu cuenta está inactiva o el personal asociado fue dado de baja.',
            ], 403);
        }

        return $next($request);
    }
}
