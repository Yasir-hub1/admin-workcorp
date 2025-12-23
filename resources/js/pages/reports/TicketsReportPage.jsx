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

export default function TicketsReportPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    priority: '',
    category: '',
    assigned_to: '',
    client_id: '',
    search: '',
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await apiClient.get('/users', { params: { per_page: 200 } })).data.data || [],
  });

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => (await apiClient.get('/clients', { params: { per_page: 200 } })).data.data || [],
  });

  const params = useMemo(() => {
    const p = { page, per_page: 15 };
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) p[k] = v;
    });
    return p;
  }, [filters, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'tickets', params],
    queryFn: async () => (await apiClient.get('/reports/tickets', { params })).data,
  });

  const columns = [
    { key: 'ticket_number', header: 'Ticket' },
    { key: 'title', header: 'Título' },
    { key: 'client', header: 'Cliente', render: (_, row) => row.client?.business_name || '-' },
    { key: 'category', header: 'Categoría' },
    { key: 'priority', header: 'Prioridad' },
    { key: 'status', header: 'Estado' },
    { key: 'assigned_to', header: 'Asignado', render: (_, row) => row.assigned_to?.name || 'Sin asignar' },
  ];

  const exportExcel = async () => {
    try {
      const exportParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) exportParams.set(k, v);
      });
      const url = `/reports/tickets/export${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
      await downloadExcel(url, `reporte_tickets_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      toast.error('No se pudo exportar el Excel');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reporte de Tickets</h1>
            <p className="mt-1 text-sm text-gray-500">Filtros + exportación a Excel.</p>
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
                { value: 'open', label: 'Abierto' },
                { value: 'assigned', label: 'Asignado' },
                { value: 'in_progress', label: 'En progreso' },
                { value: 'resolved', label: 'Resuelto' },
                { value: 'closed', label: 'Cerrado' },
                { value: 'cancelled', label: 'Cancelado' },
              ]}
            />
            <Select
              label="Prioridad"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              placeholder="Todas"
              options={[
                { value: 'low', label: 'Baja' },
                { value: 'medium', label: 'Media' },
                { value: 'high', label: 'Alta' },
                { value: 'urgent', label: 'Urgente' },
              ]}
            />
            <Input label="Categoría" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} placeholder="Ej: TI" />
            <Select
              label="Asignado a"
              value={filters.assigned_to}
              onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })}
              placeholder="Todos"
              options={(users || []).map((u) => ({ value: String(u.id), label: u.name }))}
            />
            <Select
              label="Cliente"
              value={filters.client_id}
              onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}
              placeholder="Todos"
              options={(clients || []).map((c) => ({ value: String(c.id), label: c.business_name || c.legal_name || 'Cliente' }))}
            />
            <div className="md:col-span-6">
              <Input label="Buscar" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Nro ticket, título, descripción..." />
            </div>
          </div>
        </Card>

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


