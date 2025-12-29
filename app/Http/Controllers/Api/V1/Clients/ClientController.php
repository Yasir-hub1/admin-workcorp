<?php

namespace App\Http\Controllers\Api\V1\Clients;

use App\Http\Controllers\Controller;
use App\Http\Requests\Clients\StoreClientRequest;
use App\Http\Requests\Clients\UpdateClientRequest;
use App\Http\Resources\V1\Clients\ClientResource;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    private function applyVisibilityScope(Request $request, $query)
    {
        $user = $request->user();
        if (!$user) return $query;

        // Super admin: vista total
        if ($user->hasRole('super_admin') || $user->hasPermission('clients.view-all')) {
            return $query;
        }

        // Vista por área
        if ($user->hasPermission('clients.view-area')) {
            $areaId = $user->area_id;
            if ($areaId) {
                return $query->where('area_id', $areaId);
            }
            // fallback seguro si no tiene área asignada
            return $query->where('assigned_to', $user->id);
        }

        // Vista propia (default)
        return $query->where('assigned_to', $user->id);
    }

    /**
     * Display a listing of clients.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::with(['area', 'assignedUser', 'contacts', 'services']);
        $query = $this->applyVisibilityScope($request, $query);

        // Filters - solo aplicar si tienen valor
        if ($request->has('area_id') && !empty($request->area_id)) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', $request->category);
        }

        if ($request->has('assigned_to') && !empty($request->assigned_to)) {
            $query->where('assigned_to', $request->assigned_to);
        }

        if ($request->has('type') && !empty($request->type)) {
            // Mapear tipo del frontend al backend
            $typeMap = [
                'empresa' => 'company',
                'persona_natural' => 'individual',
            ];
            $type = $typeMap[$request->type] ?? $request->type;
            $query->where('client_type', $type);
        }

        if ($request->has('client_type') && !empty($request->client_type)) {
            $query->where('client_type', $request->client_type);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('business_name', 'like', "%{$search}%")
                  ->orWhere('legal_name', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $clients = $query->latest('registration_date')->paginate($perPage);

        // Obtener estadísticas
        $statsQuery = $this->applyVisibilityScope($request, Client::query());
        $totalClients = $statsQuery->count();
        $activeClients = $statsQuery->clone()->where('status', 'active')->count();
        $byStatus = $statsQuery->clone()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Mapear estados del backend al frontend
        $statusMap = [
            'active' => 'activo',
            'inactive' => 'inactivo',
            'prospect' => 'prospecto',
            'lost' => 'perdido',
        ];
        
        $formattedByStatus = [];
        foreach ($byStatus as $status => $count) {
            $key = $statusMap[$status] ?? $status;
            $formattedByStatus[$key] = $count;
        }

        return response()->json([
            'success' => true,
            'data' => ClientResource::collection($clients->items()),
            'meta' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ],
            'statistics' => [
                'total_clients' => $totalClients,
                'active_clients' => $activeClients,
                'by_status' => $formattedByStatus,
            ],
        ]);
    }

    /**
     * Store a newly created client.
     */
    public function store(StoreClientRequest $request): JsonResponse
    {
        $data = $request->validated();
        $client = Client::create($data);

        // Create contacts if provided
        if ($request->has('contacts')) {
            foreach ($request->contacts as $contact) {
                $client->contacts()->create($contact);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Cliente creado exitosamente',
            'data' => new ClientResource($client->load(['area', 'assignedUser', 'contacts'])),
        ], 201);
    }

    /**
     * Display the specified client.
     */
    public function show($id): JsonResponse
    {
        $client = $this->applyVisibilityScope(
            request(),
            Client::with(['area', 'assignedUser', 'contacts', 'services'])
        )->where('id', $id)->first();

        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'Cliente no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new ClientResource($client),
        ]);
    }

    /**
     * Get client kardex (complete history of services, payments, renewals, incidents).
     */
    public function kardex($id): JsonResponse
    {
        $client = Client::find($id);

        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'Cliente no encontrado',
            ], 404);
        }

        // Load all related data (Kardex: servicios adquiridos)
        $clientServices = $client->services()
            ->with(['service', 'renewals', 'payments.receivedBy', 'incidents', 'assignedUser', 'area'])
            ->orderBy('start_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        // Build kardex entries
        $kardex = [];

        foreach ($clientServices as $cs) {
            $catalogName = $cs->service?->name ?? 'Servicio';
            $servicePayload = [
                // id de kardex (client_service)
                'id' => $cs->id,
                'service_id' => $cs->service_id,
                'name' => $catalogName,
                'status' => $cs->status,
                'start_date' => $cs->start_date?->format('Y-m-d'),
                'end_date' => $cs->end_date?->format('Y-m-d'),
                'contract_amount' => $cs->contract_amount !== null ? (float) $cs->contract_amount : null,
                'payment_frequency' => $cs->payment_frequency,
                'assigned_user' => $cs->assignedUser ? [
                    'id' => $cs->assignedUser->id,
                    'name' => $cs->assignedUser->name,
                ] : null,
                'area' => $cs->area ? [
                    'id' => $cs->area->id,
                    'name' => $cs->area->name,
                ] : null,
                'catalog' => $cs->service ? [
                    'id' => $cs->service->id,
                    'name' => $cs->service->name,
                    'code' => $cs->service->code,
                    'category' => $cs->service->category,
                    'billing_type' => $cs->service->billing_type,
                    'price' => $cs->service->price !== null ? (float) $cs->service->price : null,
                ] : null,
            ];

            // Service creation
            if ($cs->start_date) {
                $kardex[] = [
                    'type' => 'service_created',
                    'date' => $cs->start_date->format('Y-m-d'),
                    'description' => "Servicio adquirido: {$catalogName}",
                    'amount' => $cs->contract_amount ? (float) $cs->contract_amount : null,
                    'service' => $servicePayload,
                ];
            }

            // Renewals
            foreach ($cs->renewals as $renewal) {
                $kardex[] = [
                    'type' => 'service_renewal',
                    'date' => $renewal->renewal_date ? $renewal->renewal_date->format('Y-m-d') : null,
                    'description' => "Renovación de servicio: {$catalogName}",
                    'amount' => $renewal->renewal_amount ? (float) $renewal->renewal_amount : null,
                    'service' => $servicePayload,
                    'renewal' => [
                        'id' => $renewal->id,
                        'notes' => $renewal->notes,
                    ],
                ];
            }

            // Payments
            foreach ($cs->payments as $payment) {
                $kardex[] = [
                    'type' => 'payment',
                    'date' => $payment->payment_date ? $payment->payment_date->format('Y-m-d') : null,
                    'description' => "Pago recibido: {$catalogName}",
                    'amount' => $payment->amount ? (float) $payment->amount : null,
                    'payment_method' => $payment->payment_method,
                    'invoice_number' => $payment->invoice_number,
                    'received_by' => $payment->receivedBy ? [
                        'id' => $payment->receivedBy->id,
                        'name' => $payment->receivedBy->name,
                    ] : null,
                    'service' => $servicePayload,
                ];
            }

            // Incidents
            foreach ($cs->incidents as $incident) {
                $kardex[] = [
                    'type' => 'incident',
                    'date' => $incident->incident_date ? $incident->incident_date->format('Y-m-d') : null,
                    'description' => "Incidencia reportada: {$catalogName}",
                    'incident' => [
                        'id' => $incident->id,
                        'type' => $incident->severity,
                        'description' => $incident->description,
                        'status' => $incident->status,
                    ],
                    'service' => $servicePayload,
                ];
            }
        }

        // Sort by date descending
        usort($kardex, function ($a, $b) {
            $dateA = $a['date'] ?? '';
            $dateB = $b['date'] ?? '';
            return strcmp($dateB, $dateA);
        });

        // Calculate summary
        $totalServices = $clientServices->count();
        $today = now()->startOfDay();
        $activeServices = $clientServices->filter(function ($s) use ($today) {
            // status null (data vieja) => tratar como active
            $status = $s->status ?? 'active';
            if ($status !== 'active' && $status !== 'expiring') return false;
            if ($s->end_date && $s->end_date->copy()->startOfDay()->lt($today)) return false;
            return true;
        })->count();
        $expiringServices = $clientServices->filter(function ($s) use ($today) {
            $end = $s->end_date ? $s->end_date->copy()->startOfDay() : null;
            if (!$end) return false;
            return $end->gte($today) && $end->lte($today->copy()->addDays(15));
        })->count();
        $expiredServices = $clientServices->filter(function ($s) use ($today) {
            $end = $s->end_date ? $s->end_date->copy()->startOfDay() : null;
            return $end ? $end->lt($today) : false;
        })->count();
        $totalPayments = $clientServices->sum(function ($service) {
            return $service->payments->sum('amount');
        });
        $totalContractAmount = $clientServices->sum(function ($service) {
            return $service->contract_amount ?? 0;
        });
        $totalRenewals = $clientServices->sum(function ($service) {
            return $service->renewals->count();
        });
        $totalIncidents = $clientServices->sum(function ($service) {
            return $service->incidents->count();
        });

        return response()->json([
            'success' => true,
            'data' => [
                'client' => new ClientResource($client),
                'client_services' => $clientServices->map(function ($cs) {
                    return [
                        'id' => $cs->id,
                        'client_id' => $cs->client_id,
                        'service_id' => $cs->service_id,
                        'service' => $cs->service ? [
                            'id' => $cs->service->id,
                            'name' => $cs->service->name,
                            'code' => $cs->service->code,
                            'category' => $cs->service->category,
                            'billing_type' => $cs->service->billing_type,
                            'price' => $cs->service->price !== null ? (float) $cs->service->price : null,
                        ] : null,
                        'start_date' => $cs->start_date?->format('Y-m-d'),
                        'end_date' => $cs->end_date?->format('Y-m-d'),
                        'contract_amount' => $cs->contract_amount !== null ? (float) $cs->contract_amount : null,
                        'payment_frequency' => $cs->payment_frequency,
                        'status' => $cs->status,
                        'auto_renewal' => (bool) ($cs->auto_renewal ?? false),
                        'billing_day' => $cs->billing_day,
                        'assigned_user' => $cs->assignedUser ? [
                            'id' => $cs->assignedUser->id,
                            'name' => $cs->assignedUser->name,
                        ] : null,
                        'area' => $cs->area ? [
                            'id' => $cs->area->id,
                            'name' => $cs->area->name,
                        ] : null,
                    ];
                })->values(),
                'kardex' => $kardex,
                'summary' => [
                    'total_services' => $totalServices,
                    'active_services' => $activeServices,
                    'expiring_services' => $expiringServices,
                    'expired_services' => $expiredServices,
                    'total_payments' => (float) $totalPayments,
                    'total_contract_amount' => (float) $totalContractAmount,
                    'total_renewals' => $totalRenewals,
                    'total_incidents' => $totalIncidents,
                ],
            ],
        ]);
    }

    /**
     * Update the specified client.
     */
    public function update(UpdateClientRequest $request, $id): JsonResponse
    {
        $client = Client::find($id);

        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'Cliente no encontrado',
            ], 404);
        }

        $data = $request->validated();
        $client->update($data);

        // Update contacts if provided
        if ($request->has('contacts')) {
            $client->contacts()->delete();
            foreach ($request->contacts as $contact) {
                $client->contacts()->create($contact);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Cliente actualizado exitosamente',
            'data' => new ClientResource($client->load(['area', 'assignedUser', 'contacts'])),
        ]);
    }

    /**
     * Remove the specified client.
     */
    public function destroy($id): JsonResponse
    {
        $client = Client::find($id);

        if (!$client) {
            return response()->json([
                'success' => false,
                'message' => 'Cliente no encontrado',
            ], 404);
        }

        $client->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cliente eliminado exitosamente',
        ]);
    }

    /**
     * Get clients statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = $this->applyVisibilityScope($request, Client::query());

        if ($request->has('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        $totalClients = $query->count();
        $activeClients = $query->clone()->where('status', 'active')->count();
        $inactiveClients = $query->clone()->where('status', 'inactive')->count();
        $prospects = $query->clone()->where('status', 'prospect')->count();

        $byStatus = $query->clone()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $byCategory = $query->clone()
            ->selectRaw('category, COUNT(*) as count')
            ->groupBy('category')
            ->get();

        $byArea = [];
        if ($request->user()?->hasRole('super_admin') || $request->user()?->hasPermission('clients.view-all')) {
            $byArea = Client::with('area')
                ->selectRaw('area_id, COUNT(*) as count')
                ->groupBy('area_id')
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'total_clients' => $totalClients,
                'active_clients' => $activeClients,
                'inactive_clients' => $inactiveClients,
                'prospects' => $prospects,
                'by_status' => $byStatus,
                'by_category' => $byCategory,
                'by_area' => $byArea,
            ],
        ]);
    }
}

