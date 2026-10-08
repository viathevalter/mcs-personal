import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PedidoStatusBadge } from './PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import type { Pedido } from '../types';
import { usePedidoFinanceAccess } from '../hooks/usePedidoFinanceAccess';

interface Props {
  pedidos: Pedido[];
  isLoading: boolean;
}

export function PedidosTable({ pedidos, isLoading }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasFinanceAccess } = usePedidoFinanceAccess();

  if (isLoading) {
    return <div className="text-center py-10 text-muted-foreground">{t('cockpit_pedidos.loading')}</div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg">
        <p className="text-muted-foreground">{t('cockpit_pedidos.empty')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium whitespace-nowrap">{t('cockpit_pedidos.table.code')}</th>
              <th className="px-4 py-3 font-medium">{t('cockpit_pedidos.table.company')}</th>
              <th className="px-4 py-3 font-medium">{t('cockpit_pedidos.table.client_site')}</th>
              <th className="px-4 py-3 font-medium">{t('cockpit_pedidos.table.commercial_status')}</th>
              <th className="px-4 py-3 font-medium">{t('cockpit_pedidos.table.operational_status')}</th>
              <th className="px-4 py-3 font-medium">{t('cockpit_pedidos.table.expected_start')}</th>
              {hasFinanceAccess && <th className="px-4 py-3 font-medium text-right">{t('cockpit_pedidos.table.total_revenue')}</th>}
              <th className="px-4 py-3 font-medium text-center">{t('cockpit_pedidos.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pedidos.map((pedido) => (
              <tr 
                key={pedido.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                onClick={() => navigate(`/operacoes/pedidos/${pedido.id}`)}
              >
                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {pedido.codigo}
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {pedido.order_type === 'new_allocation' ? t('cockpit_pedidos.table.types.new_allocation') : pedido.order_type === 'expansion' ? t('cockpit_pedidos.table.types.expansion') : t('cockpit_pedidos.table.types.direct')}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {pedido.empresa?.trade_name || pedido.empresa?.nome || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900 dark:text-slate-200">{pedido.client?.trade_name || pedido.client?.legal_name || t('cockpit_pedidos.table.unknown_client')}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{pedido.client_site?.name || t('cockpit_pedidos.table.no_site')}</div>
                </td>
                <td className="px-4 py-3">
                  <PedidoStatusBadge type="commercial" status={pedido.commercial_status} />
                </td>
                <td className="px-4 py-3">
                  <PedidoStatusBadge type="operational" status={pedido.operational_status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {pedido.expected_start_date ? format(new Date(pedido.expected_start_date), 'dd/MM/yyyy') : '-'}
                </td>
                {hasFinanceAccess && (
                  <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-500">
                    {formatCurrency(pedido.total_revenue_snapshot || 0)}
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">
                      {t('cockpit_pedidos.table.margin')}: {pedido.margin_percent_snapshot}%
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <button 
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title={t('cockpit_pedidos.table.view_details')}
                  >
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
