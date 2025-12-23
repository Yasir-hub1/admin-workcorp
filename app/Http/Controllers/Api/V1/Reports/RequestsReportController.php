<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Request as RequestModel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequestsReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RequestModel::with(['user', 'approvedBy', 'area']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        // Rango por fecha de creación (para reportes administrativos)
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->get('per_page', 15);
        $requests = $query->latest()->paginate($perPage);

        $rows = collect($requests->items())->map(function (RequestModel $r) {
            return [
                'id' => $r->id,
                'type' => $r->type,
                'title' => $r->title,
                'status' => $r->status,
                'start_date' => $r->start_date?->format('Y-m-d'),
                'end_date' => $r->end_date?->format('Y-m-d'),
                'days_requested' => $r->days_requested,
                'user' => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name] : null,
                'area' => $r->area ? ['id' => $r->area->id, 'name' => $r->area->name] : null,
                'approved_by' => $r->approvedBy ? ['id' => $r->approvedBy->id, 'name' => $r->approvedBy->name] : null,
                'approved_at' => $r->approved_at?->toISOString(),
                'created_at' => $r->created_at?->toISOString(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ],
        ]);
    }
}


