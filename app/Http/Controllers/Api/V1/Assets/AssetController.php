<?php

namespace App\Http\Controllers\Api\V1\Assets;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assets\StoreAssetRequest;
use App\Http\Requests\Assets\UpdateAssetRequest;
use App\Http\Resources\V1\Assets\AssetResource;
use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    /**
     * Display a listing of assets.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Asset::with(['area', 'assignedUser', 'maintenances']);

        // Filters - solo aplicar si tienen valor
        if ($request->has('area_id') && !empty($request->area_id)) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('status') && !empty($request->status)) {
            // Mapear estados del frontend al backend si es necesario
            $statusMap = [
                'disponible' => 'available',
                'en_uso' => 'in_use',
                'en_mantenimiento' => 'maintenance',
                'en_reparacion' => 'repair',
                'dado_de_baja' => 'decommissioned',
            ];
            $status = $statusMap[$request->status] ?? $request->status;
            $query->where('status', $status);
        }

        if ($request->has('assigned_to') && !empty($request->assigned_to)) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', 'like', "%{$request->category}%");
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $assets = $query->latest()->paginate($perPage);

        // Obtener estadísticas (sin filtros para estadísticas globales)
        $statsQuery = Asset::query();
        $totalValue = $statsQuery->sum('acquisition_cost');
        $byStatus = $statsQuery->clone()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Convertir status keys a formato esperado por frontend
        $statusMap = [
            'available' => 'disponible',
            'in_use' => 'en_uso',
            'maintenance' => 'en_mantenimiento',
            'repair' => 'en_reparacion',
            'decommissioned' => 'dado_de_baja',
        ];
        
        $formattedByStatus = [];
        foreach ($byStatus as $status => $count) {
            $key = $statusMap[$status] ?? $status;
            $formattedByStatus[$key] = $count;
        }

        return response()->json([
            'success' => true,
            'data' => AssetResource::collection($assets->items()),
            'meta' => [
                'current_page' => $assets->currentPage(),
                'last_page' => $assets->lastPage(),
                'per_page' => $assets->perPage(),
                'total' => $assets->total(),
            ],
            'statistics' => [
                'total_value' => (float) $totalValue,
                'by_status' => $formattedByStatus,
            ],
        ]);
    }

    /**
     * Store a newly created asset.
     */
    public function store(StoreAssetRequest $request): JsonResponse
    {
        $data = $request->validated();
        
        // Calculate current value if not provided
        if (!isset($data['current_value'])) {
            $asset = new Asset($data);
            $data['current_value'] = $asset->getCurrentValueAttribute(null);
        }

        $asset = Asset::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Activo creado exitosamente',
            'data' => new AssetResource($asset->load(['area', 'assignedUser'])),
        ], 201);
    }

    /**
     * Display the specified asset.
     */
    public function show($id): JsonResponse
    {
        $asset = Asset::with(['area', 'assignedUser', 'maintenances.performedBy'])->find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Activo no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new AssetResource($asset),
        ]);
    }

    /**
     * Update the specified asset.
     */
    public function update(UpdateAssetRequest $request, $id): JsonResponse
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Activo no encontrado',
            ], 404);
        }

        $data = $request->validated();
        
        // Recalculate current value if acquisition_cost or purchase_date changed
        if (isset($data['acquisition_cost']) || isset($data['purchase_date'])) {
            $tempAsset = $asset->replicate();
            $tempAsset->fill($data);
            $data['current_value'] = $tempAsset->getCurrentValueAttribute(null);
        }

        $asset->update($data);
        $asset->load(['area', 'assignedUser']);

        return response()->json([
            'success' => true,
            'message' => 'Activo actualizado exitosamente',
            'data' => new AssetResource($asset),
        ]);
    }

    /**
     * Remove the specified asset.
     */
    public function destroy($id): JsonResponse
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Activo no encontrado',
            ], 404);
        }

        $asset->delete();

        return response()->json([
            'success' => true,
            'message' => 'Activo eliminado exitosamente',
        ]);
    }

    /**
     * Get assets statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = Asset::query();

        if ($request->has('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        $totalAssets = $query->count();
        $totalValue = $query->sum('acquisition_cost');
        $currentValue = $query->sum('current_value');
        $depreciation = $totalValue - $currentValue;

        $byStatus = $query->clone()
            ->selectRaw('status, COUNT(*) as count, SUM(acquisition_cost) as total_value')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $byArea = Asset::with('area')
            ->selectRaw('area_id, COUNT(*) as count, SUM(acquisition_cost) as total_value')
            ->groupBy('area_id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_assets' => $totalAssets,
                'total_value' => (float) $totalValue,
                'current_value' => (float) $currentValue,
                'depreciation' => (float) $depreciation,
                'by_status' => $byStatus,
                'by_area' => $byArea,
            ],
        ]);
    }

    /**
     * Generate a unique asset code.
     */
    public function generateCode(Request $request): JsonResponse
    {
        $prefix = 'AST';
        $areaId = $request->input('area_id');
        $category = $request->input('category');
        
        // Si hay área seleccionada, usar su código como prefijo
        if ($areaId) {
            $area = \App\Models\Area::find($areaId);
            if ($area && $area->code) {
                $prefix = strtoupper($area->code);
            }
        }

        // Si hay categoría, usar sus iniciales
        if ($category) {
            $categoryWords = explode(' ', $category);
            $categoryPrefix = '';
            foreach ($categoryWords as $word) {
                if (!empty($word)) {
                    $categoryPrefix .= strtoupper(substr($word, 0, 1));
                }
            }
            if (strlen($categoryPrefix) > 0 && strlen($categoryPrefix) <= 3) {
                $prefix = $categoryPrefix;
            }
        }

        // Buscar el último código con este prefijo
        // Usar sintaxis compatible con PostgreSQL y MySQL
        $dbDriver = \DB::connection()->getDriverName();
        if ($dbDriver === 'pgsql') {
            $lastAsset = Asset::where('code', 'like', $prefix . '-%')
                ->orderByRaw('CAST(SUBSTRING(code, ' . (strlen($prefix) + 2) . ') AS INTEGER) DESC')
                ->first();
        } else {
            $lastAsset = Asset::where('code', 'like', $prefix . '-%')
                ->orderByRaw('CAST(SUBSTRING(code, ' . (strlen($prefix) + 2) . ') AS UNSIGNED) DESC')
                ->first();
        }

        $nextNumber = 1;
        if ($lastAsset && $lastAsset->code) {
            // Extraer el número del último código
            $parts = explode('-', $lastAsset->code);
            if (count($parts) > 1 && is_numeric($parts[1])) {
                $nextNumber = (int) $parts[1] + 1;
            }
        }

        // Generar el nuevo código con padding de ceros (001, 002, etc.)
        $code = $prefix . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        // Verificar que sea único
        $counter = 1;
        while (Asset::where('code', $code)->exists()) {
            $code = $prefix . '-' . str_pad($nextNumber + $counter, 3, '0', STR_PAD_LEFT);
            $counter++;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'code' => $code,
            ],
        ]);
    }
}

