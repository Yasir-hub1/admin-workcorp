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

export default function MeetingsReportPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    status: 'scheduled',
    meeting_type: '',
    area_id: '',
    organizer_id: '',
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
    queryKey: ['reports', 'meetings', params],
    queryFn: async () => (await apiClient.get('/reports/meetings', { params })).data,
  });

  const columns = [
    { key: 'title', header: 'Título' },
    { key: 'status', header: 'Estado' },
    { key: 'meeting_type', header: 'Tipo' },
    { key: 'start_time', header: 'Inicio' },
    { key: 'end_time', header: 'Fin' },
    { key: 'location', header: 'Lugar' },
    { key: 'organizer', header: 'Organizador', render: (_, row) => row.organizer?.name || '-' },
    { key: 'area', header: 'Área', render: (_, row) => row.area?.name || '-' },
  ];

  const exportExcel = async () => {
    try {
      const exportParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) exportParams.set(k, v);
      });
      const url = `/reports/meetings/export${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
      await downloadExcel(url, `reporte_reuniones_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      toast.error('No se pudo exportar el Excel');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reporte de Reuniones</h1>
            <p className="mt-1 text-sm text-gray-500">Por defecto muestra reuniones activas (scheduled).</p>
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
              options={[
                { value: '', label: 'Todos' },
                { value: 'scheduled', label: 'Programada' },
                { value: 'in_progress', label: 'En progreso' },
                { value: 'completed', label: 'Completada' },
                { value: 'cancelled', label: 'Cancelada' },
              ]}
            />
            <Select
              label="Tipo"
              value={filters.meeting_type}
              onChange={(e) => setFilters({ ...filters, meeting_type: e.target.value })}
              placeholder="Todos"
              options={[
                { value: 'internal', label: 'Interna' },
                { value: 'external', label: 'Externa' },
                { value: 'client', label: 'Cliente' },
              ]}
            />
            <Select
              label="Área"
              value={filters.area_id}
              onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}
              placeholder="Todas"
              options={(areas || []).map((a) => ({ value: String(a.id), label: a.name }))}
            />
            <Select
              label="Organizador"
              value={filters.organizer_id}
              onChange={(e) => setFilters({ ...filters, organizer_id: e.target.value })}
              placeholder="Todos"
              options={(users || []).map((u) => ({ value: String(u.id), label: u.name }))}
            />
            <div className="md:col-span-6">
              <Input label="Buscar" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Título, descripción, lugar..." />
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


