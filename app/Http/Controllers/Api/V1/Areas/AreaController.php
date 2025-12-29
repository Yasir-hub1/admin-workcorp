<?php

namespace App\Http\Controllers\Api\V1\Areas;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
        // Convertir is_active a booleano si viene como string
        if ($request->has('is_active')) {
            $isActive = $request->input('is_active');
            if (is_string($isActive)) {
                $request->merge(['is_active' => in_array(strtolower($isActive), ['1', 'true', 'yes', 'on'])]);
            }
        }

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
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:10240',
            'colors' => 'nullable|array',
            'colors.*' => 'nullable|string',
            'is_active' => 'required|boolean',
            'order' => 'nullable|integer',
            'managers' => 'nullable|array',
            'managers.*' => 'exists:staff,id',
        ]);

        // Separar managers si vienen en el request
        $managers = $request->input('managers', []);
        unset($validated['managers']);

        // Manejar subida de logo
        if ($request->hasFile('logo')) {
            $logoPath = $request->file('logo')->store('areas/logos', 'public');
            $validated['logo_path'] = $logoPath;
        }
        unset($validated['logo']);

        // Normalizar colores (asegurar que sean arrays válidos)
        if ($request->has('colors') && is_array($request->colors)) {
            $colors = array_filter($request->colors, function ($color) {
                return !empty($color) && is_string($color) && preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color);
            });
            // Validar que haya entre 2 y 3 colores válidos
            if (count($colors) > 0 && count($colors) <= 3) {
                $validated['colors'] = array_values($colors); // Reindexar y mantener solo válidos
            } else {
                unset($validated['colors']);
            }
        } else {
            unset($validated['colors']);
        }

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

        // Convertir is_active a booleano si viene como string
        if ($request->has('is_active')) {
            $isActive = $request->input('is_active');
            if (is_string($isActive)) {
                $request->merge(['is_active' => in_array(strtolower($isActive), ['1', 'true', 'yes', 'on'])]);
            }
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:areas,code,' . $area->id,
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:areas,id',
            'manager_id' => 'nullable|exists:users,id',
            'budget_monthly' => 'nullable|numeric|min:0',
            'budget_annual' => 'nullable|numeric|min:0',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:10240',
            'colors' => 'nullable|array',
            'colors.*' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'order' => 'nullable|integer',
            'managers' => 'nullable|array',
            'managers.*' => 'exists:staff,id',
        ]);

        // Separar managers si vienen en el request
        $managers = $request->input('managers', []);
        unset($validated['managers']);

        // Manejar subida de logo
        if ($request->hasFile('logo')) {
            // Eliminar logo anterior si existe
            if ($area->logo_path && Storage::disk('public')->exists($area->logo_path)) {
                Storage::disk('public')->delete($area->logo_path);
            }
            $logoPath = $request->file('logo')->store('areas/logos', 'public');
            $validated['logo_path'] = $logoPath;
        }
        unset($validated['logo']);

        // Normalizar colores
        if ($request->has('colors') && is_array($request->colors)) {
            $colors = array_filter($request->colors, function ($color) {
                return !empty($color) && is_string($color) && preg_match('/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/', $color);
            });
            // Validar que haya entre 2 y 3 colores válidos (o permitir 1 si se está actualizando)
            if (count($colors) > 0 && count($colors) <= 3) {
                $validated['colors'] = array_values($colors);
            } else {
                $validated['colors'] = null;
            }
        } elseif ($request->has('colors') && empty($request->colors)) {
            // Si se envía array vacío, eliminar colores
            $validated['colors'] = null;
        }

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

    /**
     * Assign staff members (personal) to an area.
     * Nota: un personal puede estar en varias áreas (pivot area_staff con is_manager=false).
     */
    public function assignStaffMembers(Request $request, $id): JsonResponse
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

        $staffIds = collect($request->staff_ids)->map(fn ($v) => (int) $v)->unique()->values();
        $today = now()->toDateString();
        $actorId = $request->user()->id;

        // Obtener asignaciones actuales (solo personal, no managers)
        $current = DB::table('area_staff')
            ->where('area_id', $area->id)
            ->where('is_manager', false)
            ->whereNull('unassigned_at')
            ->pluck('staff_id')
            ->map(fn ($v) => (int) $v)
            ->toArray();

        $currentIds = collect($current);
        $toUnassign = $currentIds->diff($staffIds)->values();

        DB::beginTransaction();
        try {
            // Marcar como desasignados los que ya no están
            if ($toUnassign->isNotEmpty()) {
                DB::table('area_staff')
                    ->where('area_id', $area->id)
                    ->where('is_manager', false)
                    ->whereNull('unassigned_at')
                    ->whereIn('staff_id', $toUnassign->toArray())
                    ->update([
                        'unassigned_at' => $today,
                        'updated_at' => now(),
                    ]);
            }

            // Para cada staff_id seleccionado:
            // - si existe registro (aunque esté unassigned), reactivar (unassigned_at=null)
            // - si no existe, insertar
            foreach ($staffIds as $sid) {
                $exists = DB::table('area_staff')
                    ->where('area_id', $area->id)
                    ->where('staff_id', $sid)
                    ->where('is_manager', false)
                    ->exists();

                if ($exists) {
                    DB::table('area_staff')
                        ->where('area_id', $area->id)
                        ->where('staff_id', $sid)
                        ->where('is_manager', false)
                        ->update([
                            'unassigned_at' => null,
                            'assigned_at' => $today,
                            'assigned_by' => $actorId,
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('area_staff')->insert([
                        'area_id' => $area->id,
                        'staff_id' => $sid,
                        'is_manager' => false,
                        'assigned_at' => $today,
                        'unassigned_at' => null,
                        'assigned_by' => $actorId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'No se pudo asignar personal',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Personal asignado correctamente',
            'data' => $area->load(['managers.user', 'staffMembers.user']),
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

    /**
     * Generate a unique area code based on the area name.
     */
    public function generateCode(Request $request): JsonResponse
    {
        $name = $request->input('name');
        
        if (!$name || empty(trim($name))) {
            return response()->json([
                'success' => false,
                'message' => 'El nombre del área es requerido para generar el código',
            ], 400);
        }

        // Generar código basado en las iniciales del nombre
        $words = explode(' ', trim($name));
        $code = '';
        
        // Si tiene una sola palabra, tomar las primeras 3-4 letras
        if (count($words) === 1) {
            $word = strtoupper($words[0]);
            // Remover caracteres especiales
            $word = preg_replace('/[^A-Z0-9]/', '', $word);
            $code = substr($word, 0, 4);
        } else {
            // Si tiene múltiples palabras, tomar la primera letra de cada palabra
            foreach ($words as $word) {
                if (!empty($word)) {
                    $firstChar = strtoupper(substr(trim($word), 0, 1));
                    // Solo letras
                    if (preg_match('/[A-Z]/', $firstChar)) {
                        $code .= $firstChar;
                    }
                }
                // Limitar a 4 caracteres máximo
                if (strlen($code) >= 4) {
                    break;
                }
            }
        }

        // Asegurar que tenga al menos 2 caracteres
        if (strlen($code) < 2) {
            $code = strtoupper(substr(preg_replace('/[^A-Z0-9]/', '', $name), 0, 3));
        }

        // Verificar que sea único, si no, agregar número
        $originalCode = $code;
        $counter = 1;
        while (Area::where('code', $code)->exists()) {
            // Si el código tiene más de 3 caracteres, truncar y agregar número
            if (strlen($originalCode) > 2) {
                $code = substr($originalCode, 0, 2) . $counter;
            } else {
                $code = $originalCode . $counter;
            }
            $counter++;
            // Limitar intentos
            if ($counter > 999) {
                $code = $originalCode . time();
                break;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $code,
            ],
        ]);
    }
}
