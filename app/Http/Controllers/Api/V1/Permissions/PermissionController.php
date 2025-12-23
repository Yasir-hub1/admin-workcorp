<?php

namespace App\Http\Controllers\Api\V1\Permissions;

use App\Http\Controllers\Controller;
use App\Http\Requests\Permissions\StorePermissionRequest;
use App\Http\Requests\Permissions\UpdatePermissionRequest;
use App\Http\Resources\V1\Permissions\PermissionResource;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * Display a listing of permissions.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Permission::with('roles');

        // Filters
        if ($request->has('module') && !empty($request->module)) {
            $query->where('module', $request->module);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('display_name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $permissions = $query->orderBy('module')->orderBy('name')->paginate($perPage);

        // Get unique modules for filter
        $modules = Permission::distinct()->pluck('module')->sort()->values();

        return response()->json([
            'success' => true,
            'data' => PermissionResource::collection($permissions->items()),
            'meta' => [
                'current_page' => $permissions->currentPage(),
                'last_page' => $permissions->lastPage(),
                'per_page' => $permissions->perPage(),
                'total' => $permissions->total(),
            ],
            'modules' => $modules,
        ]);
    }

    /**
     * Store a newly created permission.
     */
    public function store(StorePermissionRequest $request): JsonResponse
    {
        $data = $request->validated();
        
        $permission = Permission::create([
            'name' => $data['name'],
            'module' => $data['module'],
            'display_name' => $data['display_name'],
            'description' => $data['description'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permiso creado correctamente',
            'data' => new PermissionResource($permission),
        ], 201);
    }

    /**
     * Display the specified permission.
     */
    public function show($id): JsonResponse
    {
        $permission = Permission::with('roles')->find($id);

        if (!$permission) {
            return response()->json([
                'success' => false,
                'message' => 'Permiso no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new PermissionResource($permission),
        ]);
    }

    /**
     * Update the specified permission.
     */
    public function update(UpdatePermissionRequest $request, $id): JsonResponse
    {
        $permission = Permission::find($id);

        if (!$permission) {
            return response()->json([
                'success' => false,
                'message' => 'Permiso no encontrado',
            ], 404);
        }

        $data = $request->validated();
        
        $permission->update([
            'name' => $data['name'] ?? $permission->name,
            'module' => $data['module'] ?? $permission->module,
            'display_name' => $data['display_name'] ?? $permission->display_name,
            'description' => $data['description'] ?? $permission->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permiso actualizado correctamente',
            'data' => new PermissionResource($permission->load('roles')),
        ]);
    }

    /**
     * Remove the specified permission.
     */
    public function destroy($id): JsonResponse
    {
        $permission = Permission::find($id);

        if (!$permission) {
            return response()->json([
                'success' => false,
                'message' => 'Permiso no encontrado',
            ], 404);
        }

        // Check if permission is assigned to any role
        if ($permission->roles()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un permiso que está asignado a roles',
            ], 400);
        }

        $permission->delete();

        return response()->json([
            'success' => true,
            'message' => 'Permiso eliminado correctamente',
        ]);
    }

    /**
     * Get all permissions grouped by module.
     */
    public function modules(): JsonResponse
    {
        $modules = Permission::distinct()->pluck('module')->sort()->values();

        return response()->json([
            'success' => true,
            'data' => $modules,
        ]);
    }
}
