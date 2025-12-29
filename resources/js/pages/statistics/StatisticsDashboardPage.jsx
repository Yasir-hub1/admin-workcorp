import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import AppLayout from '../../layouts/AppLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import apiClient from '../../api/client';
import useAuthStore from '../../store/authStore';

const COLORS = ['#6366F1', '#22C55E', '#F97316', '#EF4444', '#06B6D4', '#A855F7', '#64748B'];

function ChartCard({ title, children }) {
  return (
    <Card>
      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="h-72">{children}</div>
      </div>
    </Card>
  );
}

export default function StatisticsDashboardPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const isJefeArea = useAuthStore((s) => s.isJefeArea);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { isAuthenticated, user } = useAuthStore();

  const [filters, setFilters] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    };
  });

  const params = useMemo(() => ({ ...filters }), [filters]);

  const canView = isSuperAdmin() || isJefeArea() || hasPermission('statistics.view');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['statistics', 'overview', params],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/statistics/overview', { params });
        console.log('Statistics response:', response.data);
        return response.data.data;
      } catch (err) {
        console.error('Error fetching statistics:', err);
        console.error('Error response:', err.response?.data);
        throw err;
      }
    },
    enabled: canView && isAuthenticated && !!user,
    retry: 1,
  });

  const kpis = data?.kpis || {};
  const topClients = data?.top_clients_by_tickets || [];
  const ticketsByStatus = data?.tickets_by_status || [];
  const ticketsByPriority = data?.tickets_by_priority || [];
  const meetingsByStatus = data?.meetings_by_status || [];
  const requestsByStatus = data?.requests_by_status || [];
  const expensesByStatus = data?.expenses_by_status || [];
  const trend = data?.trend || [];

  if (!canView) {
    return (
      <AppLayout>
        <Card>
          <div className="text-gray-900 font-semibold">Estadísticas</div>
          <div className="text-sm text-gray-500 mt-1">No tienes permisos para ver este módulo.</div>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Estadísticas</h1>
            <p className="mt-1 text-sm text-gray-500">Dashboard con datos relevantes y gráficos.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
            <Button variant="outline" onClick={() => refetch()}>
              Actualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <div className="text-xs text-gray-500">Tickets (total)</div>
            <div className="text-2xl font-bold text-gray-900">{kpis.tickets_total ?? '-'}</div>
            <div className="text-sm text-gray-500 mt-1">Abiertos: {kpis.tickets_open ?? '-'}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">Reuniones</div>
            <div className="text-2xl font-bold text-gray-900">{kpis.meetings_total ?? '-'}</div>
            <div className="text-sm text-gray-500 mt-1">Próximas: {kpis.meetings_upcoming ?? '-'}</div>
          </Card>
          <Card>
            <div className="text-xs text-gray-500">Gastos (monto)</div>
            <div className="text-2xl font-bold text-gray-900">{kpis.expenses_total_amount ?? '-'}</div>
            <div className="text-sm text-gray-500 mt-1">Solicitudes: {kpis.requests_total ?? '-'}</div>
          </Card>
        </div>

        {error && (
          <Card>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-red-600">Error al cargar estadísticas</div>
              <div className="text-sm text-red-500">
                {error.response?.data?.message || error.message || 'No se pudo cargar estadísticas.'}
              </div>
              {error.response?.status === 403 && (
                <div className="text-xs text-gray-500 mt-1">
                  No tienes permisos para ver estadísticas. Verifica que tengas el permiso 'statistics.view'.
                </div>
              )}
            </div>
          </Card>
        )}

        {isLoading && (
          <Card>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              <span className="ml-3 text-sm text-gray-500">Cargando estadísticas...</span>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Top clientes por tickets (soporte)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="client_name" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="tickets_count" name="Tickets" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="open_count" name="Abiertos" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tickets por estado">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie data={ticketsByStatus} dataKey="value" nameKey="name" outerRadius={110}>
                  {ticketsByStatus.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tickets por prioridad">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ticketsByPriority}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Reuniones por estado">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={meetingsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#06B6D4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Solicitudes por estado">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#A855F7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Gastos por estado (monto)">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#64748B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Tendencias (tickets, reuniones, gastos)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" hide />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="tickets" stroke="#6366F1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="meetings" stroke="#06B6D4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" stroke="#64748B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </AppLayout>
  );
}


