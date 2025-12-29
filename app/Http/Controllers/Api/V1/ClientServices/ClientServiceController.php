<?php

namespace App\Http\Controllers\Api\V1\ClientServices;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientService;
use App\Models\ClientServiceIncident;
use App\Models\ClientServicePayment;
use App\Models\ClientServiceRenewal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ClientServiceController extends Controller
{
    /**
     * Registrar un servicio adquirido por un cliente (Kardex).
     */
    public function storeForClient(Request $request, $clientId): JsonResponse
    {
        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'service_id' => 'required|exists:services,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'contract_duration_months' => 'nullable|integer|min:1',
            'contract_amount' => 'nullable|numeric|min:0',
            'payment_frequency' => 'nullable|in:monthly,quarterly,annual,one_time',
            'status' => 'nullable|in:active,expiring,expired,suspended,cancelled',
            'auto_renewal' => 'nullable|boolean',
            'billing_day' => 'nullable|integer|min:1|max:31',
            'assigned_to' => 'nullable|exists:users,id',
            'area_id' => 'nullable|exists:areas,id',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'message' => 'Datos inválidos', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        $clientService = ClientService::create([
            'client_id' => $client->id,
            'service_id' => $data['service_id'],
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
            'contract_duration_months' => $data['contract_duration_months'] ?? null,
            'contract_amount' => $data['contract_amount'] ?? null,
            'payment_frequency' => $data['payment_frequency'] ?? 'monthly',
            'status' => $data['status'] ?? 'active',
            'auto_renewal' => (bool) ($data['auto_renewal'] ?? false),
            'billing_day' => $data['billing_day'] ?? null,
            'assigned_to' => $data['assigned_to'] ?? null,
            'area_id' => $data['area_id'] ?? null,
            'created_by' => $request->user()?->id,
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Servicio agregado al kardex correctamente',
            'data' => $clientService->load(['service', 'assignedUser', 'area']),
        ], 201);
    }

    public function payment(Request $request, $id): JsonResponse
    {
        $clientService = ClientService::find($id);
        if (!$clientService) {
            return response()->json(['success' => false, 'message' => 'Registro de kardex no encontrado'], 404);
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
        $payment = ClientServicePayment::create([
            'client_service_id' => $clientService->id,
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
            'data' => $payment->load('receivedBy'),
        ], 201);
    }

    public function renew(Request $request, $id): JsonResponse
    {
        $clientService = ClientService::find($id);
        if (!$clientService) {
            return response()->json(['success' => false, 'message' => 'Registro de kardex no encontrado'], 404);
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

        $renewal = ClientServiceRenewal::create([
            'client_service_id' => $clientService->id,
            'renewal_date' => now()->toDateString(),
            'previous_end_date' => $clientService->end_date,
            'new_end_date' => $data['new_end_date'],
            'renewal_amount' => $data['renewal_amount'] ?? null,
            'renewed_by' => $request->user()?->id,
            'notes' => $data['notes'] ?? null,
        ]);

        $clientService->update([
            'end_date' => $data['new_end_date'],
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Renovación registrada correctamente',
            'data' => [
                'renewal' => $renewal,
                'client_service' => $clientService->fresh()->load(['service', 'assignedUser', 'area']),
            ],
        ], 201);
    }

    public function incident(Request $request, $id): JsonResponse
    {
        $clientService = ClientService::find($id);
        if (!$clientService) {
            return response()->json(['success' => false, 'message' => 'Registro de kardex no encontrado'], 404);
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

        $incident = ClientServiceIncident::create([
            'client_service_id' => $clientService->id,
            'reported_by' => $request->user()?->id,
            'incident_date' => $data['incident_date'],
            'description' => $data['description'],
            'severity' => $data['severity'],
            'status' => 'open',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Incidencia registrada correctamente',
            'data' => $incident->load('reportedBy'),
        ], 201);
    }
}


