import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import AppLayout from '../../layouts/AppLayout';
import apiClient from '../../api/client';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Table from '../../components/common/Table';
import Pagination from '../../components/common/Pagination';
import { downloadExcel } from '../../utils/downloadFile';
import toast from 'react-hot-toast';

export default function ExpensesReportPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    category: '',
    area_id: '',
    created_by: '',
    search: '',
  });

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => (await apiClient.get('/areas')).data.data || [],
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get('/users', { params: { per_page: 200 } })).data.data || [],
  });

  const params = useMemo(() => {
    const p = { page, per_page: 15 };
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) p[k] = v;
    });
    return p;
  }, [filters, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'expenses', params],
    queryFn: async () => (await apiClient.get('/reports/expenses', { params })).data,
  });

  const columns = [
    { key: 'expense_date', header: 'Fecha' },
    { key: 'description', header: 'Descripción' },
    { key: 'category', header: 'Categoría' },
    { key: 'status', header: 'Estado' },
    { key: 'amount', header: 'Monto' },
    { key: 'supplier_name', header: 'Proveedor' },
    { key: 'area', header: 'Área', render: (_, row) => row.area?.name || '-' },
    { key: 'created_by', header: 'Creado por', render: (_, row) => row.created_by?.name || '-' },
  ];

  const exportExcel = async () => {
    try {
      const exportParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) exportParams.set(k, v);
      });
      const url = `/reports/expenses/export${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
      await downloadExcel(url, `reporte_gastos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      toast.error('No se pudo exportar el Excel');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reporte de Gastos</h1>
            <p className="mt-1 text-sm text-gray-500">Filtros parametrizados + exportación a Excel.</p>
          </div>
          <Button onClick={exportExcel}>Exportar Excel</Button>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input label="Desde" type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
            <Input label="Hasta" type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
            <Select
              label="Estado"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              placeholder="Todos"
              options={[
                { value: 'pending', label: 'Pendiente' },
                { value: 'approved', label: 'Aprobado' },
                { value: 'rejected', label: 'Rechazado' },
                { value: 'paid', label: 'Pagado' },
              ]}
            />
            <Input label="Categoría" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} placeholder="Ej: transporte" />
            <Select
              label="Área"
              value={filters.area_id}
              onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}
              placeholder="Todas"
              options={(areas || []).map((a) => ({ value: String(a.id), label: a.name }))}
            />
            <Select
              label="Creado por"
              value={filters.created_by}
              onChange={(e) => setFilters({ ...filters, created_by: e.target.value })}
              placeholder="Todos"
              options={(users || []).map((u) => ({ value: String(u.id), label: u.name }))}
            />
            <div className="md:col-span-6">
              <Input label="Buscar" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Descripción, proveedor, nro documento..." />
            </div>
          </div>
        </Card>

        {data?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Card><div className="text-sm text-gray-500">Total</div><div className="text-lg font-semibold">{data.summary.total_amount}</div></Card>
            <Card><div className="text-sm text-gray-500">Pendiente</div><div className="text-lg font-semibold">{data.summary.pending_amount}</div></Card>
            <Card><div className="text-sm text-gray-500">Aprobado</div><div className="text-lg font-semibold">{data.summary.approved_amount}</div></Card>
            <Card><div className="text-sm text-gray-500">Pagado</div><div className="text-lg font-semibold">{data.summary.paid_amount}</div></Card>
            <Card><div className="text-sm text-gray-500">Rechazado</div><div className="text-lg font-semibold">{data.summary.rejected_amount}</div></Card>
          </div>
        )}

        <Card padding={false}>
          <Table columns={columns} data={data?.data || []} loading={isLoading} />
          {data?.meta && data.meta.total > data.meta.per_page && (
            <Pagination
              currentPage={data.meta.current_page}
              totalPages={data.meta.last_page}
              perPage={data.meta.per_page}
              totalItems={data.meta.total}
              onPageChange={setPage}
            />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}


