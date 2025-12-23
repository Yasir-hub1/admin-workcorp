<?php

namespace App\Exports\Reports;

use App\Models\Ticket;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class TicketsReportExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private array $filters = [])
    {
    }

    public function collection(): Collection
    {
        $q = Ticket::query()->with(['createdBy', 'assignedTo', 'client', 'area']);

        foreach (['status', 'priority', 'category', 'assigned_to', 'created_by', 'client_id', 'area_id'] as $key) {
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
                $qq->where('ticket_number', 'like', "%{$search}%")
                    ->orWhere('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $q->latest()->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nro Ticket',
            'Título',
            'Categoría',
            'Prioridad',
            'Estado',
            'Cliente',
            'Asignado a',
            'Creado por',
            'Área',
            'Creado (fecha/hora)',
            'SLA vence',
        ];
    }

    public function map($row): array
    {
        /** @var Ticket $row */
        return [
            $row->id,
            $row->ticket_number,
            $row->title,
            $row->category,
            $row->priority,
            $row->status,
            $row->client?->business_name,
            $row->assignedTo?->name,
            $row->createdBy?->name,
            $row->area?->name,
            $row->created_at?->format('Y-m-d H:i:s'),
            $row->sla_due_at?->format('Y-m-d H:i:s'),
        ];
    }
}


