<?php

namespace App\Http\Controllers\Api\V1\Areas;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Area::with(['manager', 'parent', 'children', 'managers.user']);

        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('parent_id') && !empty($request->parent_id)) {
            if ($request->parent_id === 'root') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $request->parent_id);
            }
        }

        if ($request->boolean('root_only')) {
            $query->whereNull('parent_id');
        }

        $areas = $query->orderBy('order')->get();

        return response()->json([
            'success' => true,
            'data' => $areas,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:areas,code',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:areas,id',
            'manager_id' => 'nullable|exists:users,id',
            'budget_monthly' => 'nullable|numeric|min:0',
            'budget_annual' => 'nullable|numeric|min:0',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'location' => 'nullable|string',
            'is_active' => 'boolean',
            'order' => 'nullable|integer',
            'managers' => 'nullable|array',
            'managers.*' => 'exists:staff,id',
        ]);

        // Separar managers si vienen en el request
        $managers = $request->input('managers', []);
        unset($validated['managers']);

        $area = Area::create($validated);

        // Asignar managers si se proporcionaron
        if (!empty($managers) && is_array($managers)) {
            $area->managers()->sync(
                collect($managers)->mapWithKeys(function ($staffId) {
                    return [$staffId => [
                        'is_manager' => true,
                        'assigned_at' => now(),
                        'assigned_by' => request()->user()->id,
                    ]];
                })->toArray()
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Área creada correctamente',
            'data' => $area->load(['manager', 'parent', 'managers.user']),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $area = Area::with(['manager', 'parent', 'children', 'staff', 'managers.user', 'staffMembers.user'])->find($id);

        if (!$area) {
            return response()->json([
                'success' => false,
                'message' => 'Área no encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $area,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $area = Area::find($id);

        if (!$area) {
            return response()->json([
                'success' => false,
                'message' => 'Área no encontrada',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:areas,code,' . $area->id,
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:areas,id',
            'manager_id' => 'nullable|exists:users,id',
            'budget_monthly' => 'nullable|numeric|min:0',
            'budget_annual' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'order' => 'nullable|integer',
            'managers' => 'nullable|array',
            'managers.*' => 'exists:staff,id',
        ]);

        // Separar managers si vienen en el request
        $managers = $request->input('managers', []);
        unset($validated['managers']);

        $area->update($validated);

        // Actualizar managers si se proporcionaron
        if ($request->has('managers')) {
            if (empty($managers) || !is_array($managers)) {
                $area->managers()->detach();
            } else {
                $area->managers()->sync(
                    collect($managers)->mapWithKeys(function ($staffId) {
                        return [$staffId => [
                            'is_manager' => true,
                            'assigned_at' => now(),
                            'assigned_by' => request()->user()->id,
                        ]];
                    })->toArray()
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Área actualizada correctamente',
            'data' => $area->load(['manager', 'parent', 'managers.user']),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $area = Area::find($id);

        if (!$area) {
            return response()->json([
                'success' => false,
                'message' => 'Área no encontrada',
            ], 404);
        }

        // Verificar que no tenga hijos
        if ($area->children()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un área que tiene sub-áreas',
            ], 400);
        }

        $area->delete();

        return response()->json([
            'success' => true,
            'message' => 'Área eliminada correctamente',
        ]);
    }

    /**
     * Assign managers to an area.
     */
    public function assignManagers(Request $request, $id): JsonResponse
    {
        $request->validate([
            'staff_ids' => 'required|array',
            'staff_ids.*' => 'exists:staff,id',
        ]);

        $area = Area::find($id);

        if (!$area) {
            return response()->json([
                'success' => false,
                'message' => 'Área no encontrada',
            ], 404);
        }

        $area->managers()->sync(
            collect($request->staff_ids)->mapWithKeys(function ($staffId) use ($request) {
                return [$staffId => [
                    'is_manager' => true,
                    'assigned_at' => now(),
                    'assigned_by' => $request->user()->id,
                ]];
            })->toArray()
        );

        return response()->json([
            'success' => true,
            'message' => 'Jefes de área asignados correctamente',
            'data' => $area->load(['managers.user']),
        ]);
    }

    public function statistics($id): JsonResponse
    {
        $area = Area::find($id);

        if (!$area) {
            return response()->json([
                'success' => false,
                'message' => 'Área no encontrada',
            ], 404);
        }

        $stats = [
            'staff_count' => $area->staff()->count(),
            'active_staff_count' => $area->staff()->where('is_active', true)->count(),
            'staff_members_count' => $area->staffMembers()->count(),
            'managers_count' => $area->managers()->count(),
            'budget_monthly' => $area->budget_monthly,
            'budget_annual' => $area->budget_annual,
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
