<?php

namespace App\Http\Controllers\Api\V1\Services;

use App\Http\Controllers\Controller;
use App\Http\Requests\Services\StoreServiceRequest;
use App\Http\Requests\Services\UpdateServiceRequest;
use App\Http\Resources\V1\Services\ServiceResource;
use App\Models\Service;
use App\Models\ServiceRenewal;
use App\Models\ServicePayment;
use App\Models\ServiceIncident;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    /**
     * Display a listing of services.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::query();

        // Filters - solo aplicar si tienen valor
        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        if ($request->has('billing_type') && !empty($request->billing_type)) {
            $query->where('billing_type', $request->billing_type);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $services = $query->latest('created_at')->paginate($perPage);

        // Get statistics (without filters)
        $statsQuery = Service::query();
        $totalServices = $statsQuery->count();
        $categories = $statsQuery->clone()
            ->selectRaw('category, COUNT(*) as count')
            ->whereNotNull('category')
            ->groupBy('category')
            ->get()
            ->keyBy('category');
        $totalValue = $statsQuery->clone()->sum('price');

        return response()->json([
            'success' => true,
            'data' => ServiceResource::collection($services->items()),
            'meta' => [
                'current_page' => $services->currentPage(),
                'last_page' => $services->lastPage(),
                'per_page' => $services->perPage(),
                'total' => $services->total(),
            ],
            'statistics' => [
                'total_services' => $totalServices,
                'total_value' => (float) $totalValue,
                'categories_count' => $categories->count(),
                'by_category' => $categories,
            ],
        ]);
    }

    /**
     * Store a newly created service.
     */
    public function store(StoreServiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $service = Service::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Servicio creado exitosamente',
            'data' => new ServiceResource($service),
        ], 201);
    }

    /**
     * Display the specified service.
     */
    public function show($id): JsonResponse
    {
        $service = Service::find($id);

        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Servicio no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new ServiceResource($service),
        ]);
    }

    /**
     * Update the specified service.
     */
    public function update(UpdateServiceRequest $request, $id): JsonResponse
    {
        $service = Service::find($id);

        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Servicio no encontrado',
            ], 404);
        }

        $data = $request->validated();
        $service->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Servicio actualizado exitosamente',
            'data' => new ServiceResource($service),
        ]);
    }

    /**
     * Remove the specified service.
     */
    public function destroy($id): JsonResponse
    {
        $service = Service::find($id);

        if (!$service) {
            return response()->json([
                'success' => false,
                'message' => 'Servicio no encontrado',
            ], 404);
        }

        $service->delete();

        return response()->json([
            'success' => true,
            'message' => 'Servicio eliminado exitosamente',
        ]);
    }


    /**
     * Get services statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = Service::query();

        $totalServices = $query->count();
        
        $categories = $query->clone()
            ->selectRaw('category, COUNT(*) as count')
            ->whereNotNull('category')
            ->groupBy('category')
            ->get()
            ->keyBy('category');

        $totalValue = $query->clone()
            ->sum('price');

        return response()->json([
            'success' => true,
            'data' => [
                'total_services' => $totalServices,
                'total_value' => (float) $totalValue,
                'categories_count' => $categories->count(),
                'by_category' => $categories,
            ],
        ]);
    }

}

