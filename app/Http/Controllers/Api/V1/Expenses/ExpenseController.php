<?php

namespace App\Http\Controllers\Api\V1\Expenses;

use App\Http\Controllers\Controller;
use App\Http\Requests\Expenses\StoreExpenseRequest;
use App\Http\Requests\Expenses\UpdateExpenseRequest;
use App\Http\Requests\Expenses\ApproveExpenseRequest;
use App\Http\Resources\V1\Expenses\ExpenseResource;
use App\Models\Expense;
use App\Models\ExpenseApproval;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    /**
     * Display a listing of expenses.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Expense::with(['area', 'createdBy', 'paidByUser', 'approvals.approvedBy', 'attachments']);

        // Filters - solo aplicar si tienen valor
        if ($request->has('area_id') && !empty($request->area_id)) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        if ($request->has('category') && !empty($request->category)) {
            $query->where('category', 'like', "%{$request->category}%");
        }

        if ($request->has('created_by') && !empty($request->created_by)) {
            $query->where('created_by', $request->created_by);
        }

        if ($request->has('start_date') && !empty($request->start_date)) {
            $query->where('expense_date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && !empty($request->end_date)) {
            $query->where('expense_date', '<=', $request->end_date);
        }

        if ($request->has('date_from') && !empty($request->date_from)) {
            $query->where('expense_date', '>=', $request->date_from);
        }

        if ($request->has('date_to') && !empty($request->date_to)) {
            $query->where('expense_date', '<=', $request->date_to);
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $expenses = $query->latest('expense_date')->paginate($perPage);

        // Obtener estadísticas
        $statsQuery = Expense::query();
        $totalAmount = $statsQuery->sum('amount');
        $pendingAmount = $statsQuery->clone()->where('status', 'pending')->sum('amount');
        $approvedAmount = $statsQuery->clone()->where('status', 'approved')->sum('amount');
        $paidAmount = $statsQuery->clone()->where('status', 'paid')->sum('amount');

        return response()->json([
            'success' => true,
            'data' => ExpenseResource::collection($expenses->items()),
            'meta' => [
                'current_page' => $expenses->currentPage(),
                'last_page' => $expenses->lastPage(),
                'per_page' => $expenses->perPage(),
                'total' => $expenses->total(),
            ],
            'statistics' => [
                'total_amount' => (float) $totalAmount,
                'pending_amount' => (float) $pendingAmount,
                'approved_amount' => (float) $approvedAmount,
                'paid_amount' => (float) $paidAmount,
            ],
        ]);
    }

    /**
     * Store a newly created expense.
     */
    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = $request->user()->id;
        $data['status'] = 'pending';

        $expense = Expense::create($data);

        // Handle file uploads if any
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('expenses/attachments', 'public');
                $expense->attachments()->create([
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $request->input('file_type', 'receipt'),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Gasto registrado exitosamente',
            'data' => new ExpenseResource($expense->load(['area', 'createdBy', 'attachments'])),
        ], 201);
    }

    /**
     * Display the specified expense.
     */
    public function show($id): JsonResponse
    {
        $expense = Expense::with(['area', 'createdBy', 'paidByUser', 'approvals.approvedBy', 'attachments'])->find($id);

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Gasto no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new ExpenseResource($expense),
        ]);
    }

    /**
     * Update the specified expense.
     */
    public function update(UpdateExpenseRequest $request, $id): JsonResponse
    {
        $expense = Expense::find($id);

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Gasto no encontrado',
            ], 404);
        }

        // Only allow update if status is pending
        if ($expense->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden editar gastos con estado pendiente',
            ], 422);
        }

        $data = $request->validated();
        $expense->update($data);

        // Handle new file uploads
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('expenses/attachments', 'public');
                $expense->attachments()->create([
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'file_type' => $request->input('file_type', 'receipt'),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Gasto actualizado exitosamente',
            'data' => new ExpenseResource($expense->load(['area', 'createdBy', 'attachments'])),
        ]);
    }

    /**
     * Remove the specified expense.
     */
    public function destroy($id): JsonResponse
    {
        $expense = Expense::find($id);

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Gasto no encontrado',
            ], 404);
        }

        // Only allow delete if status is pending
        if ($expense->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden eliminar gastos con estado pendiente',
            ], 422);
        }

        $expense->delete();

        return response()->json([
            'success' => true,
            'message' => 'Gasto eliminado exitosamente',
        ]);
    }

    /**
     * Approve or reject an expense.
     */
    public function approve(ApproveExpenseRequest $request, $id): JsonResponse
    {
        $expense = Expense::find($id);

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Gasto no encontrado',
            ], 404);
        }

        if ($expense->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Este gasto ya ha sido procesado',
            ], 422);
        }

        $data = $request->validated();
        $status = $data['status']; // approved or rejected

        // Create approval record
        ExpenseApproval::create([
            'expense_id' => $expense->id,
            'approved_by' => $request->user()->id,
            'status' => $status,
            'comments' => $data['comments'] ?? null,
            'approved_at' => now(),
        ]);

        // Update expense status
        $expense->update(['status' => $status]);

        return response()->json([
            'success' => true,
            'message' => $status === 'approved' ? 'Gasto aprobado exitosamente' : 'Gasto rechazado',
            'data' => new ExpenseResource($expense->load(['approvals.approvedBy'])),
        ]);
    }

    /**
     * Mark expense as paid.
     */
    public function markAsPaid(Request $request, $id): JsonResponse
    {
        $expense = Expense::find($id);

        if (!$expense) {
            return response()->json([
                'success' => false,
                'message' => 'Gasto no encontrado',
            ], 404);
        }

        if ($expense->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se pueden marcar como pagados los gastos aprobados',
            ], 422);
        }

        $data = $request->validate([
            'payment_method' => 'required|string',
            'payment_date' => 'required|date',
            'payment_operation_number' => 'nullable|string',
        ]);

        $data['paid_by'] = $request->user()->id;
        $expense->update(array_merge($data, ['status' => 'paid']));

        return response()->json([
            'success' => true,
            'message' => 'Gasto marcado como pagado exitosamente',
            'data' => new ExpenseResource($expense->load(['paidByUser'])),
        ]);
    }

    /**
     * Get expenses statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = Expense::query();

        if ($request->has('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('date_from')) {
            $query->where('expense_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->where('expense_date', '<=', $request->date_to);
        }

        $totalAmount = $query->sum('amount');
        $pendingAmount = $query->clone()->where('status', 'pending')->sum('amount');
        $approvedAmount = $query->clone()->where('status', 'approved')->sum('amount');
        $paidAmount = $query->clone()->where('status', 'paid')->sum('amount');

        $byStatus = $query->clone()
            ->selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $byCategory = $query->clone()
            ->selectRaw('category, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('category')
            ->get();

        $byArea = Expense::with('area')
            ->selectRaw('area_id, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('area_id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_amount' => (float) $totalAmount,
                'pending_amount' => (float) $pendingAmount,
                'approved_amount' => (float) $approvedAmount,
                'paid_amount' => (float) $paidAmount,
                'by_status' => $byStatus,
                'by_category' => $byCategory,
                'by_area' => $byArea,
            ],
        ]);
    }
}

