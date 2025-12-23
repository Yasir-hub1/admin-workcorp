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
    /**
     * Display a listing of clients.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Client::with(['area', 'assignedUser', 'contacts', 'services']);

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
        $statsQuery = Client::query();
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
        $client = Client::with(['area', 'assignedUser', 'contacts', 'services'])->find($id);

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

        // Load all related data
        $services = $client->services()
            ->with(['renewals', 'payments.receivedBy', 'incidents', 'assignedUser', 'area'])
            ->orderBy('start_date', 'desc')
            ->get();

        // Build kardex entries
        $kardex = [];

        foreach ($services as $service) {
            // Service creation
            if ($service->start_date) {
                $kardex[] = [
                    'type' => 'service_created',
                    'date' => $service->start_date->format('Y-m-d'),
                    'description' => "Servicio creado: {$service->name}",
                    'amount' => $service->contract_amount ? (float) $service->contract_amount : null,
                    'service' => [
                        'id' => $service->id,
                        'name' => $service->name,
                        'status' => $service->status,
                    ],
                ];
            }

            // Renewals
            foreach ($service->renewals as $renewal) {
                $kardex[] = [
                    'type' => 'service_renewal',
                    'date' => $renewal->renewal_date ? $renewal->renewal_date->format('Y-m-d') : null,
                    'description' => "Renovación de servicio: {$service->name}",
                    'amount' => $renewal->renewal_amount ? (float) $renewal->renewal_amount : null,
                    'service' => [
                        'id' => $service->id,
                        'name' => $service->name,
                    ],
                    'renewal' => [
                        'id' => $renewal->id,
                        'notes' => $renewal->notes,
                    ],
                ];
            }

            // Payments
            foreach ($service->payments as $payment) {
                $kardex[] = [
                    'type' => 'payment',
                    'date' => $payment->payment_date ? $payment->payment_date->format('Y-m-d') : null,
                    'description' => "Pago recibido: {$service->name}",
                    'amount' => $payment->amount ? (float) $payment->amount : null,
                    'payment_method' => $payment->payment_method,
                    'invoice_number' => $payment->invoice_number,
                    'received_by' => $payment->receivedBy ? [
                        'id' => $payment->receivedBy->id,
                        'name' => $payment->receivedBy->name,
                    ] : null,
                    'service' => [
                        'id' => $service->id,
                        'name' => $service->name,
                    ],
                ];
            }

            // Incidents
            foreach ($service->incidents as $incident) {
                $kardex[] = [
                    'type' => 'incident',
                    'date' => $incident->incident_date ? $incident->incident_date->format('Y-m-d') : null,
                    'description' => "Incidencia reportada: {$service->name}",
                    'incident' => [
                        'id' => $incident->id,
                        'type' => $incident->type,
                        'description' => $incident->description,
                        'status' => $incident->status,
                    ],
                    'service' => [
                        'id' => $service->id,
                        'name' => $service->name,
                    ],
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
        $totalServices = $services->count();
        $activeServices = $services->where('status', 'active')->count();
        $totalPayments = $services->sum(function ($service) {
            return $service->payments->sum('amount');
        });
        $totalRenewals = $services->sum(function ($service) {
            return $service->renewals->count();
        });
        $totalIncidents = $services->sum(function ($service) {
            return $service->incidents->count();
        });

        return response()->json([
            'success' => true,
            'data' => [
                'client' => new ClientResource($client),
                'kardex' => $kardex,
                'summary' => [
                    'total_services' => $totalServices,
                    'active_services' => $activeServices,
                    'total_payments' => (float) $totalPayments,
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
        $query = Client::query();

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

        $byArea = Client::with('area')
            ->selectRaw('area_id, COUNT(*) as count')
            ->groupBy('area_id')
            ->get();

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

