import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, DollarSign, Package, Users } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/currency';
import type { Pedido } from '../types';

interface Props {
  pedidos: Pedido[];
  itemsMap?: Record<string, { requested: number; fulfilled: number }>;
}

export function PedidoKpiCards({ pedidos, itemsMap = {} }: Props) {
  const totalPedidos = pedidos.length;
  const activePedidos = pedidos.filter(p => p.commercial_status === 'active').length;
  const pendingOperations = pedidos.filter(p => p.operational_status === 'pending_operations').length;
  const partiallyFulfilled = pedidos.filter(p => p.operational_status === 'partially_fulfilled').length;
  const fulfilled = pedidos.filter(p => p.operational_status === 'fulfilled').length;
  
  const totalRevenue = pedidos.reduce((sum, p) => sum + (p.total_revenue_snapshot || 0), 0);

  let totalRequested = 0;
  let totalFulfilled = 0;
  
  Object.values(itemsMap).forEach(v => {
    totalRequested += v.requested;
    totalFulfilled += v.fulfilled;
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pedidos Ativos / Total</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePedidos} / {totalPedidos}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Pedidos visíveis na listagem atual
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Status Operacional</CardTitle>
          <Package className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{pendingOperations}</div>
              <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-500">{partiallyFulfilled}</div>
              <p className="text-xs text-muted-foreground mt-1">Parciais</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-500">{fulfilled}</div>
              <p className="text-xs text-muted-foreground mt-1">Concluídos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Vagas (Solicitadas / Preenchidas)</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className="text-muted-foreground text-xl">{totalRequested}</span> / <span className="text-emerald-600">{totalFulfilled}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total de vagas nos pedidos ativos
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Receita Snapshot Total</CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Soma do faturamento estimado (visíveis)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
