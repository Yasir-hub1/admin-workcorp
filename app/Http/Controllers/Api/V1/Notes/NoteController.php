<?php

namespace App\Http\Controllers\Api\V1\Notes;

use App\Http\Controllers\Controller;
use App\Models\Note;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NoteController extends Controller
{
    private function canView(Note $note, User $user): bool
    {
        if ($user->isSuperAdmin()) return true;
        if ((int) $note->created_by === (int) $user->id) return true;
        return $note->recipients()->where('users.id', $user->id)->exists();
    }

    private function canEdit(Note $note, User $user): bool
    {
        if ($user->isSuperAdmin()) return true;
        return (int) $note->created_by === (int) $user->id;
    }

    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $q = trim((string) $request->get('q', ''));
        $scope = $request->get('scope', 'visible'); // visible|mine|assigned

        $notesQuery = Note::query()->with([
            'creator:id,name,email',
            'recipients:id,name,email',
        ]);

        if ($user->isSuperAdmin()) {
            // visible = todo
        } else {
            $notesQuery->where(function ($qb) use ($user) {
                $qb->where('created_by', $user->id)
                    ->orWhereHas('recipients', fn ($rq) => $rq->where('users.id', $user->id));
            });
        }

        if ($scope === 'mine') {
            $notesQuery->where('created_by', $user->id);
        } elseif ($scope === 'assigned') {
            $notesQuery->whereHas('recipients', fn ($rq) => $rq->where('users.id', $user->id));
        }

        // Búsqueda simple por título (no desencriptamos masivamente en SQL)
        if ($q !== '') {
            $driver = config('database.connections.' . config('database.default') . '.driver');
            $op = $driver === 'pgsql' ? 'ilike' : 'like';
            $notesQuery->where('title', $op, "%{$q}%");
        }

        $perPage = (int) $request->get('per_page', 20);
        $notes = $notesQuery->orderByDesc('created_at')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $notes->items(),
            'meta' => [
                'current_page' => $notes->currentPage(),
                'last_page' => $notes->lastPage(),
                'per_page' => $notes->perPage(),
                'total' => $notes->total(),
            ],
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $user = Auth::user();
        $note = Note::with(['creator:id,name,email', 'recipients:id,name,email'])->findOrFail($id);

        if (!$this->canView($note, $user)) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        return response()->json(['success' => true, 'data' => $note]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'body' => 'required|string|max:20000',
            'is_sensitive' => 'nullable|boolean',
            'recipient_user_ids' => 'required|array|min:1',
            'recipient_user_ids.*' => 'exists:users,id',
        ]);

        $note = new Note();
        $note->title = $validated['title'];
        $note->body = $validated['body']; // setter -> encrypt
        $note->is_sensitive = (bool) ($validated['is_sensitive'] ?? true);
        $note->created_by = $user->id;
        $note->save();

        $recipientIds = collect($validated['recipient_user_ids'])->map(fn ($v) => (int) $v)->unique()->values()->toArray();
        $note->recipients()->sync($recipientIds);

        // El creador siempre puede ver (ya), y super_admin por regla. No agregamos al creador como recipient.
        return response()->json([
            'success' => true,
            'message' => 'Nota creada',
            'data' => $note->load(['creator:id,name,email', 'recipients:id,name,email']),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = Auth::user();
        $note = Note::with('recipients')->findOrFail($id);

        if (!$this->canEdit($note, $user)) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $validated = $request->validate([
            'title' => 'nullable|string|max:150',
            'body' => 'nullable|string|max:20000',
            'is_sensitive' => 'nullable|boolean',
            'recipient_user_ids' => 'nullable|array|min:1',
            'recipient_user_ids.*' => 'exists:users,id',
        ]);

        if (array_key_exists('title', $validated)) $note->title = $validated['title'];
        if (array_key_exists('body', $validated)) $note->body = $validated['body'];
        if (array_key_exists('is_sensitive', $validated)) $note->is_sensitive = (bool) $validated['is_sensitive'];
        $note->save();

        if (array_key_exists('recipient_user_ids', $validated)) {
            $recipientIds = collect($validated['recipient_user_ids'])->map(fn ($v) => (int) $v)->unique()->values()->toArray();
            $note->recipients()->sync($recipientIds);
        }

        return response()->json([
            'success' => true,
            'message' => 'Nota actualizada',
            'data' => $note->load(['creator:id,name,email', 'recipients:id,name,email']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $user = Auth::user();
        $note = Note::findOrFail($id);

        if (!$this->canEdit($note, $user)) {
            return response()->json(['success' => false, 'message' => 'No autorizado'], 403);
        }

        $note->delete();
        return response()->json(['success' => true, 'message' => 'Nota eliminada']);
    }
}


