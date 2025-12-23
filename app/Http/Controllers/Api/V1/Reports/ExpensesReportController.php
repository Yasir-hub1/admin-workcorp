<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpensesReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::with(['area', 'createdBy', 'paidByUser']);

        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category')) {
            $query->where('category', 'like', '%' . $request->category . '%');
        }

        if ($request->filled('created_by')) {
            $query->where('created_by', $request->created_by);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('expense_date', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('expense_date', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%")
                    ->orWhere('supplier_name', 'like', "%{$search}%");
            });
        }

        $statsQuery = (clone $query)->without(['area', 'createdBy', 'paidByUser']);
        $summary = [
            'total_amount' => (float) ($statsQuery->sum('amount') ?? 0),
            'pending_amount' => (float) (($statsQuery->clone())->where('status', 'pending')->sum('amount') ?? 0),
            'approved_amount' => (float) (($statsQuery->clone())->where('status', 'approved')->sum('amount') ?? 0),
            'paid_amount' => (float) (($statsQuery->clone())->where('status', 'paid')->sum('amount') ?? 0),
            'rejected_amount' => (float) (($statsQuery->clone())->where('status', 'rejected')->sum('amount') ?? 0),
        ];

        $perPage = (int) $request->get('per_page', 15);
        $expenses = $query->latest('expense_date')->paginate($perPage);

        $rows = collect($expenses->items())->map(function (Expense $e) {
            return [
                'id' => $e->id,
                'expense_date' => $e->expense_date?->format('Y-m-d'),
                'description' => $e->description,
                'category' => $e->category,
                'subcategory' => $e->subcategory,
                'status' => $e->status,
                'amount' => (float) $e->amount,
                'document_number' => $e->document_number,
                'supplier_name' => $e->supplier_name,
                'area' => $e->area ? ['id' => $e->area->id, 'name' => $e->area->name] : null,
                'created_by' => $e->createdBy ? ['id' => $e->createdBy->id, 'name' => $e->createdBy->name] : null,
                'paid_by' => $e->paidByUser ? ['id' => $e->paidByUser->id, 'name' => $e->paidByUser->name] : null,
                'created_at' => $e->created_at?->toISOString(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'meta' => [
                'current_page' => $expenses->currentPage(),
                'last_page' => $expenses->lastPage(),
                'per_page' => $expenses->perPage(),
                'total' => $expenses->total(),
            ],
            'summary' => $summary,
        ]);
    }
}


