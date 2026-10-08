<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Lookups;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Client;
use App\Models\Role;
use App\Models\Staff;
use App\Models\TicketCategory;
use App\Models\User;
use App\Support\Visibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class LookupController extends Controller
{
    public function areas(Request $request): JsonResponse
    {
        $query = Area::query()->where('is_active', true)->orderBy('name');
        Visibility::constrainAreas($query, $request->user());

        $items = $query->get(['id', 'name', 'code'])->map(fn (Area $area) => [
            'id' => $area->id,
            'name' => $area->name,
            'code' => $area->code,
        ]);

        return $this->ok($items);
    }

    public function staff(Request $request): JsonResponse
    {
        $query = Staff::query()
            ->with(['user:id,name,email', 'area:id,name'])
            ->orderBy('first_name');

        if ($request->boolean('is_active', true)) {
            $query->where('is_active', true);
        }

        Visibility::constrainStaff($query, $request->user(), true);

        $items = $query->get()->map(fn (Staff $staff) => [
            'id' => $staff->id,
            'user_id' => $staff->user_id,
            'full_name' => $staff->full_name,
            'employee_number' => $staff->employee_number,
            'area_id' => $staff->area_id,
            'user' => $staff->user ? [
                'id' => $staff->user->id,
                'name' => $staff->user->name,
                'email' => $staff->user->email,
            ] : null,
        ]);

        return $this->ok($items);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query()
            ->with('staff:id,user_id,first_name,last_name,area_id')
            ->where('is_active', true)
            ->orderBy('name');

        Visibility::constrainUsers($query, $request->user(), true);

        $items = $query->get(['id', 'name', 'email', 'area_id'])->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->staff?->full_name ?: $user->name,
            'email' => $user->email,
            'area_id' => $user->area_id,
        ]);

        return $this->ok($items);
    }

    public function clients(Request $request): JsonResponse
    {
        $query = Client::query()->orderBy('business_name');
        $user = $request->user();

        Visibility::apply($query, $user, 'clients', 'assigned_to');

        $items = $query->get(['id', 'business_name', 'area_id'])->map(fn (Client $client) => [
            'id' => $client->id,
            'business_name' => $client->business_name,
            'name' => $client->business_name,
            'area_id' => $client->area_id,
        ]);

        return $this->ok($items);
    }

    public function roles(Request $request): JsonResponse
    {
        $user = $request->user();
        if (
            ! $user->isSuperAdmin()
            && ! $user->hasPermission('roles.view')
            && ! $user->hasPermission('users.create')
            && ! $user->hasPermission('users.edit')
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        $roles = Role::query()->orderBy('name')->get(['id', 'name', 'display_name']);

        return $this->ok($roles);
    }

    public function ticketCategories(): JsonResponse
    {
        $categories = TicketCategory::query()->orderBy('name')->get(['id', 'name']);

        return $this->ok($categories);
    }

    private function ok(mixed $items): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }
}
