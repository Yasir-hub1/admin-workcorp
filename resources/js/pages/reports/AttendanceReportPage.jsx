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

export default function AttendanceReportPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    group_by: 'day',
    start_date: '',
    end_date: '',
    area_id: '',
    user_id: '',
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
    queryKey: ['reports', 'attendance', params],
    queryFn: async () => (await apiClient.get('/reports/attendance', { params })).data,
  });

  const columns = [
    { key: 'user_name', header: 'Personal' },
    { key: 'period_key', header: 'Período' },
    { key: 'period_start', header: 'Inicio' },
    { key: 'period_end', header: 'Fin' },
    { key: 'days_worked', header: 'Días trabajados' },
    { key: 'absent_days', header: 'Ausente' },
    { key: 'total_hours', header: 'Horas' },
    { key: 'overtime_hours', header: 'Horas extra' },
    { key: 'late_hours', header: 'Horas tarde' },
  ];

  const exportExcel = async () => {
    try {
      const exportParams = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) exportParams.set(k, v);
      });
      const url = `/reports/attendance/export${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
      await downloadExcel(url, `reporte_asistencias_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      toast.error('No se pudo exportar el Excel');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reporte de Asistencias</h1>
            <p className="mt-1 text-sm text-gray-500">Por día/semana/mes con cálculo de horas trabajadas.</p>
          </div>
          <Button onClick={exportExcel}>Exportar Excel</Button>
        </div>

        <Card>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Select
              label="Agrupar"
              value={filters.group_by}
              onChange={(e) => setFilters({ ...filters, group_by: e.target.value })}
              options={[
                { value: 'day', label: 'Día' },
                { value: 'week', label: 'Semana' },
                { value: 'month', label: 'Mes' },
              ]}
            />
            <Input label="Desde" type="date" value={filters.start_date} onChange={(e) => setFilters({ ...filters, start_date: e.target.value })} />
            <Input label="Hasta" type="date" value={filters.end_date} onChange={(e) => setFilters({ ...filters, end_date: e.target.value })} />
            <Select
              label="Área"
              value={filters.area_id}
              onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}
              placeholder="Todas"
              options={(areas || []).map((a) => ({ value: String(a.id), label: a.name }))}
            />
            <Select
              label="Personal"
              value={filters.user_id}
              onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
              placeholder="Todos"
              options={(users || []).map((u) => ({ value: String(u.id), label: u.name }))}
            />
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


