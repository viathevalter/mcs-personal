import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import type { SolicitudOperativa } from '../../types';

interface Props {
  solicitudes: SolicitudOperativa[];
  isLoading: boolean;
}

export function PedidoSolicitudesTab({ solicitudes, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground mt-6">{t('cockpit_pedidos.solicitudes_tab.loading')}</div>;
  }

  if (!solicitudes || solicitudes.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-muted-foreground">
          {t('cockpit_pedidos.solicitudes_tab.empty')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t('cockpit_pedidos.solicitudes_tab.title')}</CardTitle>
        <CardDescription>
          {t('cockpit_pedidos.solicitudes_tab.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.solicitudes_tab.col_code')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.solicitudes_tab.col_type_title')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.solicitudes_tab.col_department')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.solicitudes_tab.col_status')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.solicitudes_tab.col_priority')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.solicitudes_tab.col_due_date')}</th>
                <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.solicitudes_tab.col_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {solicitudes.map((sol) => (
                <tr key={sol.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {sol.codigo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-slate-200">{sol.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {sol.tipo ? t(`solicitud_types.${sol.tipo}`, sol.tipo.replace('_', ' ')) : '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">
                    {sol.department || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PedidoStatusBadge type="solicitud" status={sol.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${
                      sol.priority === 'urgent' ? 'text-red-600' :
                      sol.priority === 'high' ? 'text-amber-600' :
                      sol.priority === 'normal' ? 'text-blue-600' : 'text-slate-500'
                    }`}>
                      {sol.priority ? t(`torre_controle.priorities.${sol.priority}`, sol.priority.toUpperCase()) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {sol.due_date ? format(new Date(sol.due_date), 'dd/MM/yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link 
                      to={`/operacoes/solicitudes/${sol.id}`}
                      className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title={t('cockpit_pedidos.solicitudes_tab.view_solicitud_tooltip')}
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
