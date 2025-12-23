<?php

namespace App\Exports\Reports;

use App\Models\Request as RequestModel;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class RequestsReportExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private array $filters = [])
    {
    }

    public function collection(): Collection
    {
        $q = RequestModel::query()->with(['user', 'approvedBy', 'area']);

        foreach (['status', 'type', 'user_id', 'area_id'] as $key) {
            if (!empty($this->filters[$key])) {
                $q->where($key, $this->filters[$key]);
            }
        }

        if (!empty($this->filters['start_date'])) {
            $q->whereDate('created_at', '>=', $this->filters['start_date']);
        }
        if (!empty($this->filters['end_date'])) {
            $q->whereDate('created_at', '<=', $this->filters['end_date']);
        }

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $q->where(function ($qq) use ($search) {
                $qq->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $q->latest()->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Tipo',
            'Título',
            'Estado',
            'Fecha inicio',
            'Fecha fin',
            'Días solicitados',
            'Personal',
            'Área',
            'Aprobado por',
            'Aprobado en',
            'Creado (fecha/hora)',
        ];
    }

    public function map($row): array
    {
        /** @var RequestModel $row */
        return [
            $row->id,
            $row->type,
            $row->title,
            $row->status,
            $row->start_date?->format('Y-m-d'),
            $row->end_date?->format('Y-m-d'),
            $row->days_requested,
            $row->user?->name,
            $row->area?->name,
            $row->approvedBy?->name,
            $row->approved_at?->format('Y-m-d H:i:s'),
            $row->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}


