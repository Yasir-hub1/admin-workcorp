<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Middleware usage examples:
     * - permission:roles.view
     * - permission:roles.view|roles.create  (ANY of them)
     * - permission:roles.view,roles.create  (ALL of them)
     */
    public function handle(Request $request, Closure $next, ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado',
            ], 401);
        }

        // Super admin shortcut (consistent with HasPermissions)
        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return $next($request);
        }

        // Flatten permissions, support "a|b" (ANY) and multiple args.
        $required = collect($permissions)
            ->filter(fn ($p) => is_string($p) && trim($p) !== '')
            ->map(fn ($p) => trim($p))
            ->values();

        if ($required->isEmpty()) {
            return $next($request);
        }

        $hasPermission = fn (string $perm) => method_exists($user, 'hasPermission') ? $user->hasPermission($perm) : false;

        // If any arg contains |, treat it as OR group
        foreach ($required as $permGroup) {
            if (str_contains($permGroup, '|')) {
                $any = collect(explode('|', $permGroup))
                    ->map(fn ($p) => trim($p))
                    ->filter()
                    ->some(fn ($p) => $hasPermission($p));

                if ($any) {
                    return $next($request);
                }

                // OR group not satisfied, but we still may have other OR groups in args;
                // continue and only fail after checking all OR groups.
                continue;
            }
        }

        // If at least one OR group exists and none matched, deny.
        $hasOrGroup = $required->some(fn ($p) => str_contains($p, '|'));
        if ($hasOrGroup) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        // Otherwise: ALL required (comma-separated or multiple args)
        $all = $required
            ->flatMap(fn ($p) => explode(',', $p))
            ->map(fn ($p) => trim($p))
            ->filter()
            ->every(fn ($p) => $hasPermission($p));

        if (!$all) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        return $next($request);
    }
}


