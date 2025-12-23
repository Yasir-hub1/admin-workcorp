<?php

namespace App\Http\Controllers\Api\V1\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StoreInventoryItemRequest;
use App\Http\Requests\Inventory\UpdateInventoryItemRequest;
use App\Http\Requests\Inventory\StoreMovementRequest;
use App\Http\Resources\V1\Inventory\InventoryItemResource;
use App\Http\Resources\V1\Inventory\InventoryMovementResource;
use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InventoryController extends Controller
{
    /**
     * Display a listing of inventory items.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = InventoryItem::with('movements.createdBy');

        // Filters
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('low_stock')) {
            $query->whereRaw('current_stock <= min_stock');
        }

        if ($request->has('warehouse')) {
            $query->where('warehouse', $request->warehouse);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $items = $query->latest()->paginate($perPage);

        return InventoryItemResource::collection($items);
    }

    /**
     * Store a newly created inventory item.
     */
    public function store(StoreInventoryItemRequest $request): JsonResponse
    {
        $data = $request->validated();
        $item = InventoryItem::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Item de inventario creado exitosamente',
            'data' => new InventoryItemResource($item),
        ], 201);
    }

    /**
     * Display the specified inventory item.
     */
    public function show(InventoryItem $inventoryItem): JsonResponse
    {
        $inventoryItem->load('movements.createdBy');

        return response()->json([
            'success' => true,
            'data' => new InventoryItemResource($inventoryItem),
        ]);
    }

    /**
     * Update the specified inventory item.
     */
    public function update(UpdateInventoryItemRequest $request, InventoryItem $inventoryItem): JsonResponse
    {
        $data = $request->validated();
        $inventoryItem->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Item de inventario actualizado exitosamente',
            'data' => new InventoryItemResource($inventoryItem),
        ]);
    }

    /**
     * Remove the specified inventory item.
     */
    public function destroy(InventoryItem $inventoryItem): JsonResponse
    {
        $inventoryItem->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item de inventario eliminado exitosamente',
        ]);
    }

    /**
     * Record a movement (entry, exit, transfer, adjustment).
     */
    public function recordMovement(StoreMovementRequest $request, InventoryItem $inventoryItem): JsonResponse
    {
        $data = $request->validated();
        $data['inventory_item_id'] = $inventoryItem->id;
        $data['created_by'] = $request->user()->id;
        $data['movement_date'] = $data['movement_date'] ?? now();

        $movement = InventoryMovement::create($data);

        // Update stock based on movement type
        $quantity = $data['quantity'];
        if ($data['type'] === 'entry' || $data['type'] === 'adjustment') {
            $inventoryItem->increment('current_stock', $quantity);
        } elseif ($data['type'] === 'exit') {
            if ($inventoryItem->current_stock < $quantity) {
                return response()->json([
                    'success' => false,
                    'message' => 'Stock insuficiente. Stock actual: ' . $inventoryItem->current_stock,
                ], 422);
            }
            $inventoryItem->decrement('current_stock', $quantity);
        }

        $inventoryItem->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Movimiento registrado exitosamente',
            'data' => [
                'movement' => new InventoryMovementResource($movement->load('createdBy')),
                'item' => new InventoryItemResource($inventoryItem),
            ],
        ], 201);
    }

    /**
     * Get movements for an inventory item.
     */
    public function movements(InventoryItem $inventoryItem): AnonymousResourceCollection
    {
        $movements = $inventoryItem->movements()
            ->with('createdBy')
            ->latest('movement_date')
            ->get();

        return InventoryMovementResource::collection($movements);
    }

    /**
     * Get inventory statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = InventoryItem::query();

        if ($request->has('warehouse')) {
            $query->where('warehouse', $request->warehouse);
        }

        $totalItems = $query->count();
        $totalValue = $query->selectRaw('SUM(current_stock * purchase_cost) as total')->value('total') ?? 0;
        $lowStockItems = $query->clone()->whereRaw('current_stock <= min_stock')->count();
        $outOfStockItems = $query->clone()->where('current_stock', 0)->count();

        $byCategory = $query->clone()
            ->selectRaw('category, COUNT(*) as count, SUM(current_stock * purchase_cost) as total_value')
            ->groupBy('category')
            ->get();

        $byWarehouse = $query->clone()
            ->selectRaw('warehouse, COUNT(*) as count, SUM(current_stock * purchase_cost) as total_value')
            ->groupBy('warehouse')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_items' => $totalItems,
                'total_value' => (float) $totalValue,
                'low_stock_items' => $lowStockItems,
                'out_of_stock_items' => $outOfStockItems,
                'by_category' => $byCategory,
                'by_warehouse' => $byWarehouse,
            ],
        ]);
    }
}

