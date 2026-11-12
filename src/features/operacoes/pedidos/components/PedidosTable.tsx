import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PedidoStatusBadge } from './PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import { format } from 'date-fns';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Bed,
  Phone,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserMinus,
} from 'lucide-react';
import type { Pedido, PedidoSummaryMetrics, PedidoWorkerEntry } from '../types';
import { usePedidoFinanceAccess } from '../hooks/usePedidoFinanceAccess';

interface Props {
  pedidos: Pedido[];
  summaryMap?: Record<string, PedidoSummaryMetrics>;
  isLoading: boolean;
}

function formatSafeDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

function WorkerMovementBadge({ worker }: { worker: PedidoWorkerEntry }) {
  if (worker.movement_type === 'entering') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        <ArrowUpRight className="h-3 w-3" /> {worker.movement_label}
      </span>
    );
  }
  if (worker.movement_type === 'exiting') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        <ArrowDownRight className="h-3 w-3" /> {worker.movement_label}
      </span>
    );
  }
  if (worker.movement_type === 'exited') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        <UserMinus className="h-3 w-3" /> {worker.movement_label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
      <UserCheck className="h-3 w-3" /> {worker.movement_label}
    </span>
  );
}

export function PedidosTable({ pedidos, summaryMap = {}, isLoading }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasFinanceAccess } = usePedidoFinanceAccess();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-muted-foreground">
        {t('cockpit_pedidos.loading')}
      </div>
    );
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl">
        <p className="text-muted-foreground">{t('cockpit_pedidos.empty')}</p>
      </div>
    );
  }

  const colCount = hasFinanceAccess ? 10 : 9;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Scrollable Inner Gallery */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-xs md:text-sm text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
            <tr>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('cockpit_pedidos.table.code')} / Perfis</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('cockpit_pedidos.table.company')}</th>
              <th className="px-3 py-3 font-semibold">{t('cockpit_pedidos.table.client_site')}</th>
              <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">Vagas / Lotação</th>
              <th className="px-3 py-3 font-semibold">Trabalhadores (Entrando / Saindo)</th>
              <th className="px-3 py-3 font-semibold">Alojamento (Logística)</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">Status</th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap">{t('cockpit_pedidos.table.expected_start')}</th>
              {hasFinanceAccess && (
                <th className="px-3 py-3 font-semibold text-right whitespace-nowrap">
                  {t('cockpit_pedidos.table.total_revenue')}
                </th>
              )}
              <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                {t('cockpit_pedidos.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {pedidos.map(pedido => {
              const sum = summaryMap[pedido.id] || {
                requested: 0,
                fulfilled: 0,
                profiles: [],
                includesHousing: false,
                activeWorkersCount: 0,
                enteringWorkersCount: 0,
                exitingWorkersCount: 0,
                exitedWorkersCount: 0,
                housedWorkersCount: 0,
                pendingHousingCount: 0,
                alojamentos: [],
                workers: [],
              };

              const isExpanded = expandedIds.has(pedido.id);
              const currentWorkers = sum.workers.filter(w => w.movement_type !== 'exited');
              const exitedWorkers = sum.workers.filter(w => w.movement_type === 'exited');
              const pct = sum.requested > 0 ? Math.min(100, Math.round((sum.fulfilled / sum.requested) * 100)) : 0;

              return (
                <React.Fragment key={pedido.id}>
                  <tr
                    className={`hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer ${
                      isExpanded ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                    }`}
                    onClick={() => navigate(`/operacoes/pedidos/${pedido.id}`)}
                  >
                    {/* 1. Código & Perfis */}
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-start gap-1.5">
                        <button
                          onClick={e => toggleExpand(pedido.id, e)}
                          className={`mt-0.5 p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 transition-colors ${
                            sum.workers.length > 0 ? '' : 'opacity-40'
                          }`}
                          title={
                            isExpanded
                              ? 'Recolher trabalhadores e alojamento'
                              : `Expandir equipe (${sum.workers.length} trabalhadores)`
                          }
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-indigo-600" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {pedido.codigo}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {pedido.order_type === 'new_allocation'
                              ? t('cockpit_pedidos.table.types.new_allocation')
                              : pedido.order_type === 'expansion'
                              ? t('cockpit_pedidos.table.types.expansion')
                              : t('cockpit_pedidos.table.types.direct')}
                          </div>
                          {sum.profiles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 max-w-[200px]">
                              {sum.profiles.slice(0, 2).map((prof, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[180px]"
                                  title={prof}
                                >
                                  {prof}
                                </span>
                              ))}
                              {sum.profiles.length > 2 && (
                                <span className="text-[10px] font-semibold px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                                  +{sum.profiles.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Empresa */}
                    <td className="px-3 py-2.5 whitespace-nowrap align-top">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {pedido.empresa?.trade_name || pedido.empresa?.nome || '-'}
                      </span>
                    </td>

                    {/* 3. Cliente / Obra */}
                    <td className="px-3 py-2.5 align-top max-w-[230px]">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={pedido.client?.trade_name || pedido.client?.legal_name}>
                        {pedido.client?.trade_name || pedido.client?.legal_name || t('cockpit_pedidos.table.unknown_client')}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {pedido.client_site?.name || t('cockpit_pedidos.table.no_site')}
                          {pedido.client_site?.city ? ` • ${pedido.client_site.city}` : ''}
                        </span>
                      </div>
                    </td>

                    {/* 4. Vagas / Lotação */}
                    <td className="px-3 py-2.5 text-center align-top whitespace-nowrap">
                      <div className="inline-flex flex-col items-center min-w-[76px]">
                        <div className="text-xs font-bold">
                          <span className={sum.fulfilled >= sum.requested && sum.requested > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                            {sum.fulfilled}
                          </span>
                          <span className="text-muted-foreground mx-0.5">/</span>
                          <span className="text-slate-800 dark:text-slate-200">{sum.requested}</span>
                        </div>
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5">{pct}% preenchido</span>
                      </div>
                    </td>

                    {/* 5. Trabalhadores (Entrando / Ativos / Saindo) */}
                    <td className="px-3 py-2.5 align-top min-w-[230px]" onClick={e => sum.workers.length > 0 && toggleExpand(pedido.id, e)}>
                      {sum.workers.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Nenhum trabalhador alocado</span>
                      ) : (
                        <div className="space-y-1">
                          {/* Counters Row */}
                          <div className="flex flex-wrap items-center gap-1">
                            {sum.activeWorkersCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                                <UserCheck className="h-2.5 w-2.5" /> {sum.activeWorkersCount} ativo{sum.activeWorkersCount > 1 ? 's' : ''}
                              </span>
                            )}
                            {sum.enteringWorkersCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                                <ArrowUpRight className="h-2.5 w-2.5" /> {sum.enteringWorkersCount} entrando
                              </span>
                            )}
                            {(sum.exitingWorkersCount > 0 || sum.exitedWorkersCount > 0) && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800">
                                <ArrowDownRight className="h-2.5 w-2.5" /> {sum.exitingWorkersCount + sum.exitedWorkersCount} saída{sum.exitingWorkersCount + sum.exitedWorkersCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {/* Preview of first 2 workers */}
                          <div className="flex flex-col gap-0.5">
                            {currentWorkers.slice(0, 2).map(w => (
                              <div key={w.assignment_id} className="text-[11px] flex items-center gap-1 text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                                <span className="font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {w.cod_colab}
                                </span>
                                <span className="truncate font-medium">{w.nome}</span>
                              </div>
                            ))}
                            {currentWorkers.length === 0 && exitedWorkers.slice(0, 1).map(w => (
                              <div key={w.assignment_id} className="text-[11px] flex items-center gap-1 text-rose-600/80 dark:text-rose-400 line-through truncate max-w-[240px]">
                                <span className="font-mono text-[10px] shrink-0">{w.cod_colab}</span>
                                <span className="truncate">{w.nome} (Saiu)</span>
                              </div>
                            ))}
                          </div>

                          {sum.workers.length > 0 && (
                            <button
                              type="button"
                              onClick={e => toggleExpand(pedido.id, e)}
                              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                            >
                              {isExpanded
                                ? 'Ocultar lista da equipe'
                                : sum.workers.length > 2
                                ? `Ver todos (${sum.workers.length} trabalhadores)`
                                : 'Ver detalhes da equipe'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 6. Alojamento (Logística) */}
                    <td className="px-3 py-2.5 align-top min-w-[180px]">
                      {sum.alojamentos.length > 0 ? (
                        <div className="space-y-1">
                          {sum.alojamentos.slice(0, 2).map(aloj => (
                            <div
                              key={aloj.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 max-w-[200px]"
                              title={`${aloj.codigo ? aloj.codigo + ' - ' : ''}${aloj.nome}${aloj.municipio ? ' (' + aloj.municipio + ')' : ''}`}
                            >
                              <Home className="h-3 w-3 shrink-0 text-indigo-500" />
                              <span className="truncate">
                                {aloj.codigo ? `${aloj.codigo} • ` : ''}
                                {aloj.nome}
                              </span>
                              <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900 px-1 rounded">
                                {aloj.workersCount}
                              </span>
                            </div>
                          ))}
                          {sum.alojamentos.length > 2 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{sum.alojamentos.length - 2} outro(s) alojamento(s)
                            </div>
                          )}
                          {sum.pendingHousingCount > 0 && (
                            <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {sum.pendingHousingCount} s/ alojamento
                            </div>
                          )}
                        </div>
                      ) : sum.pendingHousingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {sum.pendingHousingCount} Pend. Alojamento
                        </span>
                      ) : sum.includesHousing ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          <Home className="h-3 w-3 text-slate-400" /> Alojamento Incluso
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Sem alojamento</span>
                      )}
                    </td>

                    {/* 7. Status Comercial & Operacional */}
                    <td className="px-3 py-2.5 align-top whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <PedidoStatusBadge type="operational" status={pedido.operational_status} />
                        <PedidoStatusBadge type="commercial" status={pedido.commercial_status} />
                      </div>
                    </td>

                    {/* 8. Datas */}
                    <td className="px-3 py-2.5 align-top whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {formatSafeDate(pedido.expected_start_date)}
                      </div>
                      {pedido.expected_end_date && (
                        <div className="text-[11px] text-muted-foreground">
                          até {formatSafeDate(pedido.expected_end_date)}
                        </div>
                      )}
                    </td>

                    {/* 9. Receita Total */}
                    {hasFinanceAccess && (
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 align-top whitespace-nowrap">
                        {formatCurrency(pedido.total_revenue_snapshot || 0)}
                        <div className="text-[11px] font-normal text-muted-foreground mt-0.5">
                          {t('cockpit_pedidos.table.margin')}: {pedido.margin_percent_snapshot || 0}%
                        </div>
                      </td>
                    )}

                    {/* 10. Ações */}
                    <td className="px-3 py-2.5 text-center align-top whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={e => toggleExpand(pedido.id, e)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title="Expandir Equipe e Alojamento na Galeria"
                        >
                          <Users size={16} />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/operacoes/pedidos/${pedido.id}`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('cockpit_pedidos.table.view_details')}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Sub-row: Complete Workers (Entering/Active/Exiting) & Housing */}
                  {isExpanded && (
                    <tr className="bg-slate-50/80 dark:bg-slate-900/70 border-b border-indigo-100 dark:border-indigo-950">
                      <td colSpan={colCount} className="p-4">
                        <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-indigo-600" />
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                Controle de Equipe & Alojamento — {pedido.codigo} ({pedido.client?.trade_name || pedido.client?.legal_name})
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                                {sum.fulfilled}/{sum.requested} vagas preenchidas
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/operacoes/pedidos/${pedido.id}`)}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Abrir Cockpit 360 Completo <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {sum.workers.length === 0 ? (
                            <div className="text-center py-6 text-xs text-muted-foreground">
                              Nenhum trabalhador vinculado a este pedido até o momento.
                            </div>
                          ) : (
                            <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-800">
                              <table className="w-full text-xs text-left">
                                <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                                  <tr>
                                    <th className="px-3 py-2 font-semibold">Colaborador</th>
                                    <th className="px-3 py-2 font-semibold">Função / Perfil</th>
                                    <th className="px-3 py-2 font-semibold">Movimentação (Entrada / Saída)</th>
                                    <th className="px-3 py-2 font-semibold">Datas (Início / Saída)</th>
                                    <th className="px-3 py-2 font-semibold">Alojamento & Cama</th>
                                    <th className="px-3 py-2 font-semibold">Contato</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {sum.workers.map(w => (
                                    <tr
                                      key={w.assignment_id}
                                      className={
                                        w.movement_type === 'exited'
                                          ? 'bg-rose-50/20 dark:bg-rose-950/10 opacity-80'
                                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                                      }
                                    >
                                      <td className="px-3 py-2">
                                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                                            {w.cod_colab}
                                          </span>
                                          <span>{w.nome}</span>
                                        </div>
                                        {w.nif && <div className="text-[10px] text-muted-foreground mt-0.5">NIF/Doc: {w.nif}</div>}
                                      </td>
                                      <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">
                                        {w.funcao}
                                        {w.tarifa_acordada ? (
                                          <div className="text-[10px] text-emerald-600 font-semibold">
                                            Tarifa: {w.tarifa_acordada.toFixed(2)} €/h
                                          </div>
                                        ) : null}
                                      </td>
                                      <td className="px-3 py-2">
                                        <WorkerMovementBadge worker={w} />
                                        {w.replaced_worker_name && (
                                          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">
                                            ↳ Substituiu: <strong>{w.replaced_worker_name}</strong>
                                          </div>
                                        )}
                                        {w.replaced_by_worker_name && (
                                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                            ↳ Substituído por: <strong>{w.replaced_by_worker_name}</strong>
                                          </div>
                                        )}
                                        {w.solicitud_codigo && (
                                          <div className="text-[10px] text-muted-foreground mt-0.5">
                                            Solicitude: <strong>{w.solicitud_codigo}</strong>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <div className="text-slate-800 dark:text-slate-200">
                                          <span className="text-muted-foreground">Início:</span>{' '}
                                          <strong>{formatSafeDate(w.planned_start_date || w.start_date)}</strong>
                                        </div>
                                        {w.end_date && (
                                          <div className="text-rose-600 dark:text-rose-400 text-[11px]">
                                            Saída: <strong>{formatSafeDate(w.end_date)}</strong>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-3 py-2">
                                        {w.housing ? (
                                          <div className="space-y-0.5">
                                            <div className="inline-flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300">
                                              <Home className="h-3.5 w-3.5 shrink-0" />
                                              <span>
                                                {w.housing.alojamento_codigo ? `${w.housing.alojamento_codigo} • ` : ''}
                                                {w.housing.alojamento_nome}
                                              </span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                              {w.housing.cama_identificador && (
                                                <span className="inline-flex items-center gap-0.5">
                                                  <Bed className="h-3 w-3" /> {w.housing.cama_identificador}
                                                </span>
                                              )}
                                              {w.housing.municipio && <span>📍 {w.housing.municipio}</span>}
                                            </div>
                                          </div>
                                        ) : w.movement_type === 'exited' ? (
                                          <span className="text-[11px] text-muted-foreground">Fora da obra</span>
                                        ) : w.requires_housing ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                            <AlertCircle className="h-3.5 w-3.5" /> Pendente Alojamento
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Sem demanda aloj.
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        {w.movil ? (
                                          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                            <Phone className="h-3 w-3 text-slate-400" /> {w.movil}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
