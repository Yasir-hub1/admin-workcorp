import { Link } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import Card from '../../components/common/Card';

const cards = [
  { title: 'Reporte de Gastos', description: 'Filtros por fecha, área, estado, categoría. Exporta a Excel.', href: '/reports/expenses' },
  { title: 'Reporte de Asistencias', description: 'Por día/semana/mes, horas trabajadas, tardanzas y extras. Exporta a Excel.', href: '/reports/attendance' },
  { title: 'Reporte de Tickets', description: 'Estado, prioridad, asignado, cliente, rango de fechas. Exporta a Excel.', href: '/reports/tickets' },
  { title: 'Reporte de Solicitudes', description: 'Solicitudes del personal por estado/tipo/área/fechas. Exporta a Excel.', href: '/reports/requests' },
  { title: 'Reporte de Reuniones', description: 'Reuniones activas y por estado/tipo/fechas. Exporta a Excel.', href: '/reports/meetings' },
];

export default function ReportsIndexPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reportes</h1>
          <p className="mt-1 text-sm text-gray-500">Selecciona un reporte para ver tabla, filtros y exportación.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((c) => (
            <Link key={c.href} to={c.href} className="block">
              <Card>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-gray-900">{c.title}</div>
                  <div className="text-sm text-gray-500">{c.description}</div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}


