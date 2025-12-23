<?php

namespace App\Exports\Reports;

use App\Models\Expense;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ExpensesReportExport implements FromCollection, WithHeadings, WithMapping
{
    public function __construct(private array $filters = [])
    {
    }

    public function collection(): Collection
    {
        $q = Expense::query()->with(['area', 'createdBy', 'paidByUser']);

        if (!empty($this->filters['area_id'])) {
            $q->where('area_id', $this->filters['area_id']);
        }
        if (!empty($this->filters['status'])) {
            $q->where('status', $this->filters['status']);
        }
        if (!empty($this->filters['category'])) {
            $q->where('category', 'like', '%' . $this->filters['category'] . '%');
        }
        if (!empty($this->filters['created_by'])) {
            $q->where('created_by', $this->filters['created_by']);
        }
        if (!empty($this->filters['start_date'])) {
            $q->whereDate('expense_date', '>=', $this->filters['start_date']);
        }
        if (!empty($this->filters['end_date'])) {
            $q->whereDate('expense_date', '<=', $this->filters['end_date']);
        }
        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $q->where(function ($qq) use ($search) {
                $qq->where('description', 'like', "%{$search}%")
                    ->orWhere('document_number', 'like', "%{$search}%")
                    ->orWhere('supplier_name', 'like', "%{$search}%");
            });
        }

        return $q->latest('expense_date')->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Fecha',
            'Descripción',
            'Categoría',
            'Subcategoría',
            'Estado',
            'Monto',
            'Nro Documento',
            'Proveedor',
            'Área',
            'Creado por',
            'Pagado por',
            'Creado (fecha/hora)',
        ];
    }

    public function map($row): array
    {
        /** @var Expense $row */
        return [
            $row->id,
            $row->expense_date?->format('Y-m-d'),
            $row->description,
            $row->category,
            $row->subcategory,
            $row->status,
            (float) $row->amount,
            $row->document_number,
            $row->supplier_name,
            $row->area?->name,
            $row->createdBy?->name,
            $row->paidByUser?->name,
            $row->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}


