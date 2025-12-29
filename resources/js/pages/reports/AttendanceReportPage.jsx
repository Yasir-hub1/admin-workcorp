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
import AttendanceRecordsMapModal from '../../components/reports/AttendanceRecordsMapModal';

export default function AttendanceReportPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    group_by: 'day',
    start_date: '',
    end_date: '',
    area_id: '',
    user_id: '',
  });
  const [mapOpen, setMapOpen] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapPoints, setMapPoints] = useState([]);

  const { data: areas } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => (await apiClient.get('/areas')).data.data || [],
  });

  // IMPORTANTE: el "Personal" del sistema vive en /staff (no /users).
  // /users suele estar protegido por permisos distintos y puede devolver vacío/403 para roles que sí ven reportes.
  const { data: staffList } = useQuery({
    queryKey: ['staff', 'for-attendance-report'],
    queryFn: async () => {
      const res = await apiClient.get('/staff', { params: { per_page: 300, is_active: 'true' } });
      return res.data?.data || [];
    },
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

  const userOptions = useMemo(() => {
    const list = staffList || [];
    const areaId = filters.area_id ? String(filters.area_id) : '';

    return list
      .filter((s) => s && s.user_id) // solo staff con usuario asociado
      .filter((s) => (areaId ? String(s.area_id) === areaId : true))
      .map((s) => ({
        value: String(s.user_id),
        label: s.full_name || s.user?.name || (s.employee_number ? `N° ${s.employee_number}` : `ID ${s.user_id}`),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [staffList, filters.area_id]);

  const selectedUser = useMemo(() => {
    if (!filters.user_id) return null;
    const id = String(filters.user_id);
    const match = (staffList || []).find((s) => s && String(s.user_id) === id) || null;
    return match ? { id: match.user_id, name: match.full_name || match.user?.name || match.user_id } : null;
  }, [filters.user_id, staffList]);

  const openMap = async () => {
    if (!filters.user_id) return;
    try {
      setMapLoading(true);
      const res = await apiClient.get('/reports/attendance/locations', {
        params: {
          user_id: filters.user_id,
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        },
      });
      setMapPoints(res.data?.data?.points || []);
      setMapOpen(true);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar el mapa de marcaciones');
    } finally {
      setMapLoading(false);
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
          <div className="flex items-center gap-2">
            {filters.user_id && (
              <Button variant="outline" onClick={openMap} loading={mapLoading}>
                Ver mapa de marcaciones
              </Button>
            )}
            <Button onClick={exportExcel}>Exportar Excel</Button>
          </div>
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
              options={userOptions}
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

      <AttendanceRecordsMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        userName={selectedUser?.name}
        startDate={filters.start_date || undefined}
        endDate={filters.end_date || undefined}
        points={mapPoints}
      />
    </AppLayout>
  );
}


