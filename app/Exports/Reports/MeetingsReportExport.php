<?php

namespace App\Exports\Reports;

use App\Models\Meeting;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class MeetingsReportExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private array $filters = [])
    {
    }

    public function collection(): Collection
    {
        $q = Meeting::query()->with(['organizer', 'area']);

        foreach (['status', 'meeting_type', 'organizer_id', 'area_id'] as $key) {
            if (!empty($this->filters[$key])) {
                $q->where($key, $this->filters[$key]);
            }
        }

        if (!empty($this->filters['start_date'])) {
            $q->whereDate('start_time', '>=', $this->filters['start_date']);
        }
        if (!empty($this->filters['end_date'])) {
            $q->whereDate('start_time', '<=', $this->filters['end_date']);
        }

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $q->where(function ($qq) use ($search) {
                $qq->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%");
            });
        }

        return $q->latest('start_time')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Título',
            'Estado',
            'Tipo',
            'Inicio',
            'Fin',
            'Lugar',
            'Organizador',
            'Área',
            'Asistentes (IDs)',
            'Creado (fecha/hora)',
        ];
    }

    public function map($row): array
    {
        /** @var Meeting $row */
        return [
            $row->id,
            $row->title,
            $row->status,
            $row->meeting_type,
            $row->start_time?->format('Y-m-d H:i:s'),
            $row->end_time?->format('Y-m-d H:i:s'),
            $row->location,
            $row->organizer?->name,
            $row->area?->name,
            is_array($row->attendees) ? implode(',', $row->attendees) : (string) $row->attendees,
            $row->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}


