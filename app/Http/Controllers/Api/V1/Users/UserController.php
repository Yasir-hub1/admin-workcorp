<?php

namespace App\Http\Controllers\Api\V1\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\V1\User\UserResource;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['area', 'staff', 'roles']);

        // Filters
        if ($request->has('area_id') && !empty($request->area_id)) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('role') && !empty($request->role)) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('name', $request->role);
            });
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhereHas('staff', function ($q) use ($search) {
                      $q->where('employee_number', 'like', "%{$search}%")
                        ->orWhere('document_number', 'like', "%{$search}%");
                  });
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $users = $query->latest('created_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Hash password
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        // Create user
        $user = User::create($data);

        // Assign staff if provided
        if ($request->has('staff_id') && $request->staff_id) {
            \App\Models\Staff::where('id', $request->staff_id)->update(['user_id' => $user->id]);
        }

        // Assign roles if provided
        if ($request->has('roles') && is_array($request->roles) && count($request->roles) > 0) {
            $roles = Role::whereIn('name', $request->roles)->pluck('id');
            $user->roles()->sync($roles);
        } else {
            // Assign default role (personal)
            $user->assignRole('personal');
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado exitosamente',
            'data' => new UserResource($user->load(['area', 'staff', 'roles.permissions'])),
        ], 201);
    }

    /**
     * Display the specified user.
     */
    public function show($id): JsonResponse
    {
        $user = User::with(['area', 'staff', 'roles.permissions'])->find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new UserResource($user),
        ]);
    }

    /**
     * Update the specified user.
     */
    public function update(UpdateUserRequest $request, $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado',
            ], 404);
        }

        $data = $request->validated();

        // Hash password if provided
        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        // Update user
        $user->update($data);

        // Update staff assignment if provided
        if ($request->has('staff_id')) {
            if ($request->staff_id) {
                // Desasignar staff anterior si existe
                \App\Models\Staff::where('user_id', $user->id)->update(['user_id' => null]);
                // Asignar nuevo staff
                \App\Models\Staff::where('id', $request->staff_id)->update(['user_id' => $user->id]);
            } else {
                // Desasignar staff si se envía null
                \App\Models\Staff::where('user_id', $user->id)->update(['user_id' => null]);
            }
        }

        // Update roles if provided
        if ($request->has('roles') && is_array($request->roles) && count($request->roles) > 0) {
            $roles = Role::whereIn('name', $request->roles)->pluck('id');
            $user->roles()->sync($roles);
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado exitosamente',
            'data' => new UserResource($user->load(['area', 'staff', 'roles.permissions'])),
        ]);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado',
            ], 404);
        }

        // Prevent deleting yourself
        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes eliminar tu propia cuenta',
            ], 400);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado exitosamente',
        ]);
    }
}
