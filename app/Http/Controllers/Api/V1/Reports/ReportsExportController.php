<?php

namespace App\Http\Controllers\Api\V1\Reports;

use App\Exports\Reports\AttendanceReportExport;
use App\Exports\Reports\ExpensesReportExport;
use App\Exports\Reports\MeetingsReportExport;
use App\Exports\Reports\RequestsReportExport;
use App\Exports\Reports\TicketsReportExport;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ReportsExportController extends Controller
{
    public function expenses(Request $request)
    {
        $filters = $request->only([
            'area_id', 'status', 'category', 'created_by', 'start_date', 'end_date', 'search',
        ]);
        $filename = 'reporte_gastos_' . now()->format('Ymd_His') . '.xlsx';
        return Excel::download(new ExpensesReportExport($filters), $filename);
    }

    public function attendance(Request $request)
    {
        $filters = $request->only([
            'group_by', 'start_date', 'end_date', 'user_id', 'area_id',
        ]);
        $filename = 'reporte_asistencias_' . now()->format('Ymd_His') . '.xlsx';
        return Excel::download(new AttendanceReportExport($filters), $filename);
    }

    public function tickets(Request $request)
    {
        $filters = $request->only([
            'status', 'priority', 'category', 'assigned_to', 'created_by', 'client_id', 'area_id', 'start_date', 'end_date', 'search',
        ]);
        $filename = 'reporte_tickets_' . now()->format('Ymd_His') . '.xlsx';
        return Excel::download(new TicketsReportExport($filters), $filename);
    }

    public function requests(Request $request)
    {
        $filters = $request->only([
            'status', 'type', 'user_id', 'area_id', 'start_date', 'end_date', 'search',
        ]);
        $filename = 'reporte_solicitudes_' . now()->format('Ymd_His') . '.xlsx';
        return Excel::download(new RequestsReportExport($filters), $filename);
    }

    public function meetings(Request $request)
    {
        $filters = $request->only([
            'status', 'meeting_type', 'organizer_id', 'area_id', 'start_date', 'end_date', 'search',
        ]);
        $filename = 'reporte_reuniones_' . now()->format('Ymd_His') . '.xlsx';
        return Excel::download(new MeetingsReportExport($filters), $filename);
    }
}


