import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/shared/utils/currency';
import type { Pedido, PedidoItem } from '../../types';

interface Props {
  pedido: Pedido;
  items: PedidoItem[];
}

export function PedidoFinanceiroTab({ pedido, items }: Props) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('cockpit_pedidos.finance_tab.title')}</CardTitle>
          <CardDescription>
            {t('cockpit_pedidos.finance_tab.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase block mb-1">{t('cockpit_pedidos.finance_tab.estimated_revenue')}</span>
              <span className="text-2xl font-bold text-emerald-600">{formatCurrency(pedido.total_revenue_snapshot || 0)}</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase block mb-1">{t('cockpit_pedidos.finance_tab.base_cost')}</span>
              <span className="text-2xl font-bold text-red-600">{formatCurrency(pedido.total_cost_snapshot || 0)}</span>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <span className="text-xs text-muted-foreground uppercase block mb-1">{t('cockpit_pedidos.finance_tab.projected_margin')}</span>
              <span className={`text-2xl font-bold ${pedido.margin_percent_snapshot && pedido.margin_percent_snapshot >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {pedido.margin_percent_snapshot || 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('cockpit_pedidos.finance_tab.breakdown_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">{t('cockpit_pedidos.finance_tab.col_role')}</th>
                  <th className="px-4 py-3 text-center font-medium">{t('cockpit_pedidos.finance_tab.col_hours')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.finance_tab.col_cost_hour')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.finance_tab.col_rev_hour')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('cockpit_pedidos.finance_tab.col_subtotal')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const hours = item.planned_total_hours || 0;
                  const sellRate = item.sell_rate_hour_snapshot || 0;
                  const estimatedTotal = hours * sellRate * item.quantity_requested;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {item.job_function?.name || item.job_function_name_snapshot || t('cockpit_pedidos.items_tab.no_function')}
                        <div className="text-xs text-muted-foreground font-normal">{t('cockpit_pedidos.finance_tab.qty_short', { qty: item.quantity_requested })}</div>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {t('cockpit_pedidos.finance_tab.hours_per_person', { hours })}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(item.base_cost_hour_snapshot || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(sellRate)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">
                        {estimatedTotal > 0 ? formatCurrency(estimatedTotal) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
