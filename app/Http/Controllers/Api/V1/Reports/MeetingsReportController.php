<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Http\Controllers\Controller;
use App\Models\Meeting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeetingsReportController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Meeting::with(['organizer', 'area']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('meeting_type')) {
            $query->where('meeting_type', $request->meeting_type);
        }
        if ($request->filled('organizer_id')) {
            $query->where('organizer_id', $request->organizer_id);
        }
        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->filled('start_date')) {
            $query->whereDate('start_time', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('start_time', '<=', $request->end_date);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->get('per_page', 15);
        $meetings = $query->latest('start_time')->paginate($perPage);

        $rows = collect($meetings->items())->map(function (Meeting $m) {
            return [
                'id' => $m->id,
                'title' => $m->title,
                'status' => $m->status,
                'meeting_type' => $m->meeting_type,
                'start_time' => $m->start_time?->toISOString(),
                'end_time' => $m->end_time?->toISOString(),
                'location' => $m->location,
                'organizer' => $m->organizer ? ['id' => $m->organizer->id, 'name' => $m->organizer->name] : null,
                'area' => $m->area ? ['id' => $m->area->id, 'name' => $m->area->name] : null,
                'attendees' => $m->attendees ?? [],
                'created_at' => $m->created_at?->toISOString(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
            'meta' => [
                'current_page' => $meetings->currentPage(),
                'last_page' => $meetings->lastPage(),
                'per_page' => $meetings->perPage(),
                'total' => $meetings->total(),
            ],
        ]);
    }
}


