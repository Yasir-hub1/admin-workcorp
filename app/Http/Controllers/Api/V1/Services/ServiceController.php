<?php

namespace App\Http\Controllers\Api\V1\Services;

use App\Http\Controllers\Controller;
use App\Http\Requests\Services\StoreServiceRequest;
use App\Http\Requests\Services\UpdateServiceRequest;
use App\Http\Resources\V1\Services\ServiceResource;
use App\Models\ClientService;
use App\Models\Service;
use App\Models\ServiceRenewal;
use App\Models\ServicePayment;
use App\Models\ServiceIncident;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ServiceController extends Controller
{
    /**
     * Display a listing of services.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Service::query()->with(['assignedUser', 'area']);

        // Filters - solo aplicar si tienen valor
        if ($request->has('client_id') && !empty($request->client_id)) {
            $query->where('client_id', $request->client_id);
        }

        if ($request->has('area_id') && !empty($request->area_id)) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('assigned_to') && $request->assigned_to !== '') {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

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
        $services = $query->latest('start_date')->latest('created_at')->paginate($perPage);

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
            'data' => new ServiceResource($service->load(['assignedUser', 'area'])),
        ], 201);
    }

    /**
     * Display the specified service.
     */
    public function show($id): JsonResponse
    {
        $service = Service::with(['assignedUser', 'area'])->find($id);

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
            'data' => new ServiceResource($service->load(['assignedUser', 'area'])),
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
     * Registrar un pago para el servicio (para Kardex).
     */
    public function payment(Request $request, $id): JsonResponse
    {
        $service = Service::find($id);
        if (!$service) {
            return response()->json(['success' => false, 'message' => 'Servicio no encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'invoice_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $payment = ServicePayment::create([
            'service_id' => $service->id,
            'payment_date' => $data['payment_date'],
            'amount' => $data['amount'],
            'payment_method' => $data['payment_method'],
            'invoice_number' => $data['invoice_number'] ?? null,
            'notes' => $data['notes'] ?? null,
            'received_by' => $request->user()?->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado correctamente',
            'data' => [
                'payment' => $payment->toArray(),
            ],
        ], 201);
    }

    /**
     * Registrar una renovación para el servicio (para Kardex).
     */
    public function renew(Request $request, $id): JsonResponse
    {
        $service = Service::find($id);
        if (!$service) {
            return response()->json(['success' => false, 'message' => 'Servicio no encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'new_end_date' => 'required|date',
            'renewal_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $renewal = ServiceRenewal::create([
            'service_id' => $service->id,
            'renewal_date' => now()->toDateString(),
            'previous_end_date' => $service->end_date,
            'new_end_date' => $data['new_end_date'],
            'renewal_amount' => $data['renewal_amount'] ?? null,
            'renewed_by' => $request->user()?->id,
            'notes' => $data['notes'] ?? null,
        ]);

        // Reflejar la renovación en el propio servicio
        $service->update([
            'end_date' => $data['new_end_date'],
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Renovación registrada correctamente',
            'data' => [
                'renewal' => $renewal->toArray(),
                'service' => (new ServiceResource($service->load(['assignedUser', 'area'])))->toArray($request),
            ],
        ], 201);
    }

    /**
     * Registrar una incidencia para el servicio (para Kardex).
     */
    public function incident(Request $request, $id): JsonResponse
    {
        $service = Service::find($id);
        if (!$service) {
            return response()->json(['success' => false, 'message' => 'Servicio no encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'incident_date' => 'required|date',
            'description' => 'required|string|min:3',
            'severity' => 'required|in:low,medium,high,critical',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $incident = ServiceIncident::create([
            'service_id' => $service->id,
            'reported_by' => $request->user()?->id,
            'incident_date' => $data['incident_date'],
            'description' => $data['description'],
            'severity' => $data['severity'],
            'status' => 'open',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Incidencia registrada correctamente',
            'data' => [
                'incident' => $incident->toArray(),
            ],
        ], 201);
    }


    /**
     * Get services statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Service::query();

        // Respetar visibilidad por permisos (no solo "middleware")
        if ($user && !$user->hasRole('super_admin')) {
            if ($user->hasPermission('services.view-all')) {
                // sin filtro
            } elseif ($user->hasPermission('services.view-area')) {
                $areaId = $user->area_id;
                if ($areaId) {
                    $query->where(function ($q) use ($areaId) {
                        $q->where('area_id', $areaId)
                            ->orWhereHas('client', function ($cq) use ($areaId) {
                                $cq->where('area_id', $areaId);
                            });
                    });
                } else {
                    // fallback seguro: si no tiene area asignada, solo ver propios
                    $query->where('assigned_to', $user->id);
                }
            } else {
                // view-own (o sin permiso explícito pero ruta protegida): propios
                $query->where('assigned_to', $user->id);
            }
        }

        $totalServices = $query->count();
        
        $categories = $query->clone()
            ->selectRaw('category, COUNT(*) as count')
            ->whereNotNull('category')
            ->groupBy('category')
            ->get()
            ->keyBy('category');

        $totalValue = $query->clone()
            ->sum('price');

        $today = now()->startOfDay();
        $expiringUntil = $today->copy()->addDays(15)->endOfDay();

        $activeServices = $query->clone()
            ->where(function ($q) {
                $q->whereNull('status')->orWhereIn('status', ['active', 'expiring']);
            })
            ->where(function ($q) use ($today) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $today);
            })
            ->count();

        $expiringSoonCount = $query->clone()
            ->whereNotNull('end_date')
            ->whereBetween('end_date', [$today, $expiringUntil])
            ->count();

        $canSeeExpiry = $user && ($user->hasRole('super_admin') || $user->hasPermission('services.expiry-reminders'));
        $expiringServices = [];
        if ($canSeeExpiry) {
            $csQuery = ClientService::query()->with(['client', 'service', 'assignedUser']);

            // Respetar visibilidad (services.view-all/area/own)
            if ($user && !$user->hasRole('super_admin')) {
                if ($user->hasPermission('services.view-all')) {
                    // sin filtro
                } elseif ($user->hasPermission('services.view-area')) {
                    $areaId = $user->area_id;
                    if ($areaId) {
                        $csQuery->where(function ($q) use ($areaId) {
                            $q->where('area_id', $areaId)
                              ->orWhereHas('client', fn ($cq) => $cq->where('area_id', $areaId));
                        });
                    } else {
                        $csQuery->where('assigned_to', $user->id);
                    }
                } else {
                    // view-own
                    $csQuery->where(function ($q) use ($user) {
                        $q->where('assigned_to', $user->id)
                          ->orWhereHas('client', fn ($cq) => $cq->where('assigned_to', $user->id));
                    });
                }
            }

            $expiringSoonCount = $csQuery->clone()
                ->whereNotNull('end_date')
                ->whereBetween('end_date', [$today, $expiringUntil])
                ->count();

            $expiringServices = $csQuery->clone()
                ->whereNotNull('end_date')
                ->whereBetween('end_date', [$today, $expiringUntil])
                ->orderBy('end_date')
                ->limit(12)
                ->get()
                ->map(function ($cs) {
                    $svcName = $cs->service?->name ?? 'Servicio';
                    return [
                        // id del kardex (client_service)
                        'id' => $cs->id,
                        'name' => $svcName,
                        'status' => $cs->status,
                        'end_date' => $cs->end_date?->format('Y-m-d'),
                        'start_date' => $cs->start_date?->format('Y-m-d'),
                        'contract_amount' => $cs->contract_amount !== null ? (float) $cs->contract_amount : null,
                        'payment_frequency' => $cs->payment_frequency,
                        'assigned_user' => $cs->assignedUser ? [
                            'id' => $cs->assignedUser->id,
                            'name' => $cs->assignedUser->name,
                            'email' => $cs->assignedUser->email,
                        ] : null,
                        'client' => $cs->client ? [
                            'id' => $cs->client->id,
                            'business_name' => $cs->client->business_name,
                            'legal_name' => $cs->client->legal_name,
                            'phone' => $cs->client->phone,
                            'document_number' => $cs->client->document_number,
                        ] : null,
                        'catalog_service' => $cs->service ? [
                            'id' => $cs->service->id,
                            'name' => $cs->service->name,
                            'code' => $cs->service->code,
                        ] : null,
                    ];
                })
                ->values()
                ->all();
        } else {
            // No exponer datos de vencimientos si no tiene permiso
            $expiringSoonCount = 0;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_services' => $totalServices,
                'total_value' => (float) $totalValue,
                'categories_count' => $categories->count(),
                'by_category' => $categories,
                'active_services' => $activeServices,
                'expiring_soon' => $expiringSoonCount,
                'expiring_services' => $expiringServices,
            ],
        ]);
    }

}

