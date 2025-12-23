<?php

namespace App\Http\Controllers\Api\V1\Statistics;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Meeting;
use App\Models\Request as RequestModel;
use App\Models\Ticket;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StatisticsController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $user = Auth::user();

        if ($user->hasRole('personal')) {
            return response()->json([
                'success' => false,
                'message' => 'No autorizado',
            ], 403);
        }

        $startDate = $request->get('start_date', now()->subDays(30)->toDateString());
        $endDate = $request->get('end_date', now()->toDateString());

        $areaId = null;
        if ($user->hasRole('jefe_area') && $user->area_id) {
            $areaId = (int) $user->area_id;
        } elseif ($request->filled('area_id')) {
            $areaId = (int) $request->area_id;
        }

        // Tickets base query
        $ticketsBase = Ticket::query()
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate);
        if ($areaId) {
            $ticketsBase->where('area_id', $areaId);
        }

        $ticketsByStatus = (clone $ticketsBase)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['name' => $r->status, 'value' => (int) $r->count])
            ->values();

        $ticketsByPriority = (clone $ticketsBase)
            ->select('priority', DB::raw('COUNT(*) as count'))
            ->groupBy('priority')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['name' => $r->priority, 'value' => (int) $r->count])
            ->values();

        $topClients = (clone $ticketsBase)
            ->whereNotNull('client_id')
            ->join('clients', 'clients.id', '=', 'tickets.client_id')
            ->select(
                'clients.id as client_id',
                'clients.business_name',
                DB::raw('COUNT(tickets.id) as tickets_count'),
                DB::raw("SUM(CASE WHEN tickets.status IN ('open','assigned','in_progress') THEN 1 ELSE 0 END) as open_count")
            )
            ->groupBy('clients.id', 'clients.business_name')
            ->orderByDesc('tickets_count')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'client_id' => (int) $r->client_id,
                'client_name' => $r->business_name,
                'tickets_count' => (int) $r->tickets_count,
                'open_count' => (int) $r->open_count,
            ])
            ->values();

        $ticketsTrend = (clone $ticketsBase)
            ->select(DB::raw("DATE(created_at) as date"), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw("DATE(created_at)"))
            ->orderBy(DB::raw("DATE(created_at)"))
            ->get()
            ->map(fn ($r) => ['date' => (string) $r->date, 'value' => (int) $r->count])
            ->values();

        // Meetings
        $meetingsBase = Meeting::query()
            ->whereDate('start_time', '>=', $startDate)
            ->whereDate('start_time', '<=', $endDate);
        if ($areaId) {
            $meetingsBase->where('area_id', $areaId);
        }

        $meetingsByStatus = (clone $meetingsBase)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['name' => $r->status, 'value' => (int) $r->count])
            ->values();

        $upcomingMeetingsCount = (clone $meetingsBase)
            ->where('status', 'scheduled')
            ->where('start_time', '>', now())
            ->count();

        $meetingsTrend = (clone $meetingsBase)
            ->select(DB::raw("DATE(start_time) as date"), DB::raw('COUNT(*) as count'))
            ->groupBy(DB::raw("DATE(start_time)"))
            ->orderBy(DB::raw("DATE(start_time)"))
            ->get()
            ->map(fn ($r) => ['date' => (string) $r->date, 'value' => (int) $r->count])
            ->values();

        // Requests
        $requestsBase = RequestModel::query()
            ->whereDate('created_at', '>=', $startDate)
            ->whereDate('created_at', '<=', $endDate);
        if ($areaId) {
            $requestsBase->where('area_id', $areaId);
        }

        $requestsByStatus = (clone $requestsBase)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r) => ['name' => $r->status, 'value' => (int) $r->count])
            ->values();

        // Expenses
        $expensesBase = Expense::query()
            ->whereDate('expense_date', '>=', $startDate)
            ->whereDate('expense_date', '<=', $endDate);
        if ($areaId) {
            $expensesBase->where('area_id', $areaId);
        }

        $expensesByStatus = (clone $expensesBase)
            ->select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total_amount'))
            ->groupBy('status')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($r) => [
                'name' => $r->status,
                'count' => (int) $r->count,
                'amount' => (float) ($r->total_amount ?? 0),
            ])
            ->values();

        $expensesTrend = (clone $expensesBase)
            ->select(DB::raw("DATE(expense_date) as date"), DB::raw('SUM(amount) as total'))
            ->groupBy(DB::raw("DATE(expense_date)"))
            ->orderBy(DB::raw("DATE(expense_date)"))
            ->get()
            ->map(fn ($r) => ['date' => (string) $r->date, 'value' => (float) ($r->total ?? 0)])
            ->values();

        $kpis = [
            'tickets_total' => (int) (clone $ticketsBase)->count(),
            'tickets_open' => (int) (clone $ticketsBase)->whereIn('status', ['open', 'assigned', 'in_progress'])->count(),
            'meetings_total' => (int) (clone $meetingsBase)->count(),
            'meetings_upcoming' => (int) $upcomingMeetingsCount,
            'requests_total' => (int) (clone $requestsBase)->count(),
            'expenses_total_amount' => (float) ((clone $expensesBase)->sum('amount') ?? 0),
        ];

        // Asegurar series completas (rellenar días faltantes) para charts lineales
        $days = collect();
        $cursor = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->startOfDay();
        while ($cursor->lte($end)) {
            $days->push($cursor->toDateString());
            $cursor->addDay();
        }

        $ticketsTrendMap = $ticketsTrend->keyBy('date');
        $meetingsTrendMap = $meetingsTrend->keyBy('date');
        $expensesTrendMap = $expensesTrend->keyBy('date');

        $trend = $days->map(function ($d) use ($ticketsTrendMap, $meetingsTrendMap, $expensesTrendMap) {
            return [
                'date' => $d,
                'tickets' => (int) ($ticketsTrendMap[$d]['value'] ?? 0),
                'meetings' => (int) ($meetingsTrendMap[$d]['value'] ?? 0),
                'expenses' => (float) ($expensesTrendMap[$d]['value'] ?? 0),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'filters' => [
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'area_id' => $areaId,
                ],
                'kpis' => $kpis,
                'top_clients_by_tickets' => $topClients,
                'tickets_by_status' => $ticketsByStatus,
                'tickets_by_priority' => $ticketsByPriority,
                'meetings_by_status' => $meetingsByStatus,
                'requests_by_status' => $requestsByStatus,
                'expenses_by_status' => $expensesByStatus,
                'trend' => $trend,
            ],
        ]);
    }
}


