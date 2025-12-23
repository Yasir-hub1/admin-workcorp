<?php

namespace App\Http\Controllers\Api\V1\Tickets;

use App\Http\Controllers\Controller;
use App\Models\TicketCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TicketCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->get('search', ''));

        $query = TicketCategory::query()
            ->where('is_active', true);

        if ($search !== '') {
            $like = '%' . str_replace('%', '\\%', $search) . '%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                    ->orWhere('slug', 'like', $like);
            });
        }

        $categories = $query
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'slug']);

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:80',
        ]);

        $name = trim($validated['name']);
        $slug = Str::slug($name);
        if ($slug === '') {
            // fallback muy defensivo por si Str::slug devuelve vacío
            $slug = Str::slug(Str::ascii($name));
        }

        $category = TicketCategory::withTrashed()->where('slug', $slug)->first();
        if ($category) {
            if ($category->trashed()) {
                $category->restore();
            }
            $category->update([
                'name' => $name,
                'is_active' => true,
            ]);
        } else {
            $category = TicketCategory::create([
                'name' => $name,
                'slug' => $slug,
                'is_active' => true,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Categoría registrada correctamente',
            'data' => $category->only(['id', 'name', 'slug']),
        ], 201);
    }
}


