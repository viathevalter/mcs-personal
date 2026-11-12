import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, DollarSign, Home, Package, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/shared/utils/currency';
import type { Pedido, PedidoSummaryMetrics } from '../types';
import { usePedidoFinanceAccess } from '../hooks/usePedidoFinanceAccess';

interface Props {
  pedidos: Pedido[];
  itemsMap?: Record<string, { requested: number; fulfilled: number }>;
  summaryMap?: Record<string, PedidoSummaryMetrics>;
}

export function PedidoKpiCards({ pedidos, itemsMap = {}, summaryMap = {} }: Props) {
  const { hasFinanceAccess } = usePedidoFinanceAccess();

  const totalPedidos = pedidos.length;
  const activePedidos = pedidos.filter(p => p.commercial_status === 'active').length;
  const pausedPedidos = pedidos.filter(p => p.operational_status === 'paused').length;
  const pendingOperations = pedidos.filter(p => p.operational_status === 'pending_operations').length;
  const partiallyFulfilled = pedidos.filter(p => p.operational_status === 'partially_fulfilled').length;
  const fulfilled = pedidos.filter(p => p.operational_status === 'fulfilled' || p.operational_status === 'completed').length;

  const totalRevenue = pedidos.reduce((sum, p) => sum + (p.total_revenue_snapshot || 0), 0);

  let totalRequested = 0;
  let totalFulfilled = 0;
  let totalActiveWorkers = 0;
  let totalEnteringWorkers = 0;
  let totalExitedWorkers = 0;
  let totalHousedWorkers = 0;
  let totalPendingHousing = 0;

  pedidos.forEach(p => {
    const sum = summaryMap[p.id];
    if (sum) {
      totalRequested += sum.requested;
      totalFulfilled += sum.fulfilled;
      totalActiveWorkers += sum.activeWorkersCount;
      totalEnteringWorkers += sum.enteringWorkersCount;
      totalExitedWorkers += sum.exitedWorkersCount + sum.exitingWorkersCount;
      totalHousedWorkers += sum.housedWorkersCount;
      totalPendingHousing += sum.pendingHousingCount;
    } else if (itemsMap[p.id]) {
      totalRequested += itemsMap[p.id].requested;
      totalFulfilled += itemsMap[p.id].fulfilled;
    }
  });

  const fulfillmentPct = totalRequested > 0 ? Math.min(100, Math.round((totalFulfilled / totalRequested) * 100)) : 0;

  return (
    <div className={`grid gap-3 grid-cols-1 sm:grid-cols-2 ${hasFinanceAccess ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
      {/* 1. Pedidos Ativos / Total */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pedidos Ativos / Total
            </span>
            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{activePedidos}</span>
            <span className="text-sm text-muted-foreground font-medium">/ {totalPedidos}</span>
            {pausedPedidos > 0 && (
              <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                {pausedPedidos} Pausado{pausedPedidos > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Pedidos visíveis no filtro atual</p>
        </CardContent>
      </Card>

      {/* 2. Status Operacional */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Status Operacional
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-1.5">
            <div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-500 leading-tight">{pendingOperations}</div>
              <p className="text-[11px] text-muted-foreground">Pendentes</p>
            </div>
            <div className="text-center border-x border-slate-100 dark:border-slate-800 px-1">
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-tight">{partiallyFulfilled}</div>
              <p className="text-[11px] text-muted-foreground">Parciais</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{fulfilled}</div>
              <p className="text-[11px] text-muted-foreground">Atendidos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Vagas & Lotação */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vagas (Preenchidas / Total)
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-1.5">
            <div>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalFulfilled}</span>
              <span className="text-sm text-muted-foreground font-medium"> / {totalRequested}</span>
            </div>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
              {fulfillmentPct}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${fulfillmentPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 4. Equipe (Entrando/Saindo) & Alojamentos */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Equipe & Alojamentos
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Home className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded" title="Trabalhadores ativos ou entrando em obra">
                <ArrowUpRight className="h-3 w-3" />
                {totalActiveWorkers + totalEnteringWorkers} ativos
              </span>
              {totalExitedWorkers > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded" title="Trabalhadores que saíram / substituídos / em baixa">
                  <ArrowDownRight className="h-3 w-3" />
                  {totalExitedWorkers} saídas
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span>
              Alojados: <strong className="text-indigo-600 dark:text-indigo-400">{totalHousedWorkers}</strong>
            </span>
            {totalPendingHousing > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {totalPendingHousing} pend. alojamento
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Logística em dia</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Receita Snapshot Total */}
      {hasFinanceAccess && (
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Receita Snapshot Total
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5 truncate">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Soma do faturamento estimado</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
