<?php

namespace App\Http\Controllers\Api\V1\Assets;

use App\Http\Controllers\Controller;
use App\Http\Requests\Assets\StoreMaintenanceRequest;
use App\Http\Requests\Assets\UpdateMaintenanceRequest;
use App\Http\Resources\V1\Assets\AssetMaintenanceResource;
use App\Models\Asset;
use App\Models\AssetMaintenance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetMaintenanceController extends Controller
{
    /**
     * Display a listing of maintenances for an asset.
     */
    public function index($id): JsonResponse
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Activo no encontrado',
            ], 404);
        }

        $maintenances = $asset->maintenances()
            ->with('performedBy')
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => AssetMaintenanceResource::collection($maintenances),
        ]);
    }

    /**
     * Store a newly created maintenance.
     */
    public function store(StoreMaintenanceRequest $request, $id): JsonResponse
    {
        $asset = Asset::find($id);

        if (!$asset) {
            return response()->json([
                'success' => false,
                'message' => 'Activo no encontrado',
            ], 404);
        }

        $data = $request->validated();
        $data['asset_id'] = $asset->id;
        $data['performed_by'] = $request->user()->id;

        $maintenance = AssetMaintenance::create($data);

        // Update asset status if needed
        if ($data['type'] === 'corrective' && !isset($data['completed_date'])) {
            $asset->update(['status' => 'repair']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mantenimiento registrado exitosamente',
            'data' => new AssetMaintenanceResource($maintenance->load('performedBy')),
        ], 201);
    }

    /**
     * Update the specified maintenance.
     */
    public function update(UpdateMaintenanceRequest $request, $id): JsonResponse
    {
        $maintenance = AssetMaintenance::with('asset')->find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Mantenimiento no encontrado',
            ], 404);
        }

        $data = $request->validated();
        $maintenance->update($data);

        // Update asset status when maintenance is completed
        if (isset($data['completed_date']) && $maintenance->asset && $maintenance->asset->status === 'repair') {
            $maintenance->asset->update(['status' => 'available']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Mantenimiento actualizado exitosamente',
            'data' => new AssetMaintenanceResource($maintenance->load('performedBy')),
        ]);
    }

    /**
     * Remove the specified maintenance.
     */
    public function destroy($id): JsonResponse
    {
        $maintenance = AssetMaintenance::find($id);

        if (!$maintenance) {
            return response()->json([
                'success' => false,
                'message' => 'Mantenimiento no encontrado',
            ], 404);
        }

        $maintenance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mantenimiento eliminado exitosamente',
        ]);
    }
}

