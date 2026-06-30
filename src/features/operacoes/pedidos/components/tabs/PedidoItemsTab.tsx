import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import type { PedidoItem } from '../../types';
import { usePedidoFinanceAccess } from '../../hooks/usePedidoFinanceAccess';

interface Props {
  items: PedidoItem[];
}

export function PedidoItemsTab({ items }: Props) {
  const { hasFinanceAccess } = usePedidoFinanceAccess();

  if (!items || items.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum item solicitado neste pedido.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Vagas e Itens Solicitados</CardTitle>
        <CardDescription>
          Esta listagem reflete o que foi aprovado na estimación. Futuramente, será vinculada ao Worker Assignments.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Função (Snapshot)</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Qtd (Preenchida/Solicitada)</th>
                <th className="px-4 py-3 text-right font-medium">Horas Previstas</th>
                {hasFinanceAccess && (
                  <>
                    <th className="px-4 py-3 text-right font-medium">Tarifa Base</th>
                    <th className="px-4 py-3 text-right font-medium">Tarifa Venda</th>
                    <th className="px-4 py-3 text-right font-medium">Margem</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.job_function?.name || item.job_function_name_snapshot || 'Sem Função'}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      {item.includes_accommodation_snapshot && (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">
                          Alojamento{hasFinanceAccess && item.custom_lodging_rate !== undefined && item.custom_lodging_rate !== null ? `: €${Number(item.custom_lodging_rate).toFixed(2)}/dia` : ''}
                        </span>
                      )}
                      {item.includes_transport_snapshot && <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">Transporte</span>}
                      {item.includes_ppe_snapshot && <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 px-1.5 py-0.5 rounded">EPI</span>}
                      {item.ss_regime && item.ss_regime !== 'none' && (
                        <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-1.5 py-0.5 rounded font-medium">
                          Seg. Social: {item.ss_regime === 'destacado' ? 'Destacado' : 'Local'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PedidoStatusBadge type="item" status={item.item_status || 'pending'} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-emerald-600">{item.quantity_fulfilled}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-slate-700 dark:text-slate-300">{item.quantity_requested}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {item.planned_total_hours ? `${item.planned_total_hours}h totais` : '-'}
                  </td>
                  {hasFinanceAccess && (
                    <>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatCurrency(item.base_cost_hour_snapshot || 0)}/h
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">
                        {formatCurrency(item.sell_rate_hour_snapshot || 0)}/h
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (item.margin_percent_snapshot || 0) >= 20 ? 'bg-emerald-100 text-emerald-700' :
                          (item.margin_percent_snapshot || 0) >= 10 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.margin_percent_snapshot || 0}%
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
