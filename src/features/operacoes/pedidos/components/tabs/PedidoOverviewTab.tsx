import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import { format } from 'date-fns';
import type { Pedido } from '../../types';
import { usePedidoFinanceAccess } from '../../hooks/usePedidoFinanceAccess';

interface Props {
  pedido: Pedido;
}

export function PedidoOverviewTab({ pedido }: Props) {
  const { hasFinanceAccess } = usePedidoFinanceAccess();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Código</p>
              <p className="font-medium">{pedido.codigo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Tipo do Pedido</p>
              <p className="font-medium capitalize">{pedido.order_type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Cliente</p>
              <p className="font-medium">{pedido.client?.trade_name || pedido.client?.legal_name || 'Desconhecido'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Obra / Local</p>
              <p className="font-medium">{pedido.client_site?.name || 'Nenhuma Obra Específica'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Status Comercial</p>
              <div className="mt-1"><PedidoStatusBadge type="commercial" status={pedido.commercial_status} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Status Operacional</p>
              <div className="mt-1"><PedidoStatusBadge type="operational" status={pedido.operational_status} /></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Início Previsto</p>
              <p className="font-medium">{pedido.expected_start_date ? format(new Date(pedido.expected_start_date), 'dd/MM/yyyy') : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Fim Previsto</p>
              <p className="font-medium">{pedido.expected_end_date ? format(new Date(pedido.expected_end_date), 'dd/MM/yyyy') : '-'}</p>
            </div>
          </div>
          
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground uppercase mb-1">Origem da Estimación</p>
            {pedido.source_estimacion_id ? (
              <p className="text-sm font-medium text-blue-600">Sim (ID: {pedido.source_estimacion_id})</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem origem</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Comercial</p>
              <p className="font-medium">{pedido.commercial_owner_id || 'Não Atribuído'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Operacional</p>
              <p className="font-medium">{pedido.responsible_id || 'Não Atribuído'}</p>
            </div>
          </CardContent>
        </Card>

        {hasFinanceAccess && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Snapshot Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Receita Total:</span>
                <span className="font-bold text-emerald-600">{formatCurrency(pedido.total_revenue_snapshot || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Custo Base:</span>
                <span className="font-bold text-red-600">{formatCurrency(pedido.total_cost_snapshot || 0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Margem (%):</span>
                <span className={`font-bold ${pedido.margin_percent_snapshot && pedido.margin_percent_snapshot >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {pedido.margin_percent_snapshot || 0}%
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {pedido.general_notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{pedido.general_notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
