import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Briefcase,
  Landmark,
  Receipt,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Pin,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  MessageCircle,
  Globe2,
  UserPlus,
  RefreshCw,
  Eye,
  Award,
  Layers,
} from 'lucide-react';
import { formatCurrency, formatCompactCurrency } from '@/features/financeiro/lib/utils';
import type {
  BillingHoursBIMetrics,
  CommercialBIMetrics,
  DrillDownPayload,
  FinancialBIMetrics,
  MonthlyEvolutionPoint,
  OperationalRHBIMetrics,
  WallboardWidgetDef,
  WallboardWidgetId,
} from '../types';

export const WALLBOARD_WIDGET_CATALOG: WallboardWidgetDef[] = [
  {
    id: 'kpi_global_strip',
    title: 'Faixa Executiva Global (4 Pilares)',
    subtitle: 'Resumo instantâneo de Comercial, Cobrança, Faturamento/Horas e Operacional',
    category: 'comercial',
    size: 'full',
  },
  {
    id: 'comercial_funnel',
    title: 'Comercial: Presupuestos, Aprovados, Firmados & Pedidos',
    subtitle: 'Quantidade e valor (€) de propostas, novos clientes e perfis solicitados',
    category: 'comercial',
    size: 'half',
  },
  {
    id: 'comercial_vendedores',
    title: 'Comercial: Ranking por Vendedor & Conversão',
    subtitle: 'Performance de presupuestos firmados, pedidos e perfis por comercial',
    category: 'comercial',
    size: 'half',
  },
  {
    id: 'comercial_paises',
    title: 'Comercial: Expansão por País / Sede & Mix de Perfis',
    subtitle: 'Visão Espanha, França, Itália, Dubai/EAU e perfis mais demandados',
    category: 'comercial',
    size: 'half',
  },
  {
    id: 'financeiro_cobranca_status',
    title: 'Financeiro: Cobrança & Carteira por Empresa',
    subtitle: 'Quantidade e valor de títulos emitidos, recebidos, a vencer e vencidos',
    category: 'financeiro',
    size: 'half',
  },
  {
    id: 'financeiro_cashflow_clientes',
    title: 'Financeiro: Fluxo de Caixa Estratificado por Cliente',
    subtitle: 'Estratificação de recebimentos, a vencer e inadimplência por cliente',
    category: 'financeiro',
    size: 'half',
  },
  {
    id: 'faturamento_evolucao_anual',
    title: 'Faturamento & Horas: Evolução Mês a Mês no Ano (Matéria-Prima)',
    subtitle: 'Comparativo anual mesclando Faturamento (€), Horas Trabalhadas e Trabalhadores',
    category: 'faturamento',
    size: 'full',
  },
  {
    id: 'faturamento_matriz_clientes',
    title: 'Faturamento: Matriz Cliente × Horas × Trabalhadores',
    subtitle: 'Detalhamento por cliente de horas trabalhadas, equipe alocada e tarifa média',
    category: 'faturamento',
    size: 'half',
  },
  {
    id: 'operacional_contratacoes_reemplazos',
    title: 'Operacional (RH): Novas Contratações vs Reemplazos (Substituições)',
    subtitle: 'Evolução de entradas novas, substituições e taxa de retenção em obra',
    category: 'operacional',
    size: 'half',
  },
  {
    id: 'operacional_app_horas_realtime',
    title: 'Operacional: Monitoramento de Horas no Aplicativo em Tempo Real',
    subtitle: 'Acompanhamento online conforme os trabalhadores apontam horas no App',
    category: 'operacional',
    size: 'half',
  },
  {
    id: 'operacional_clientes_alocacao',
    title: 'Operacional: Alocação e Movimentações por Cliente',
    subtitle: 'Efetivo ativo, novas contratações, reemplazos e horas App por cliente',
    category: 'operacional',
    size: 'half',
  },
  {
    id: 'comunicacao_whatsapp_app',
    title: 'Comunicação & Conformidade (WhatsApp / Portal App / Seguridade)',
    subtitle: 'Interações com equipe de campo (300–700 colaboradores) e status de Alta',
    category: 'operacional',
    size: 'half',
  },
];

interface WidgetCommonProps {
  commercial: CommercialBIMetrics;
  financial: FinancialBIMetrics;
  billingHours: BillingHoursBIMetrics;
  operational: OperationalRHBIMetrics;
  monthlyEvolution: MonthlyEvolutionPoint[];
  pinnedWidgets: WallboardWidgetId[];
  onTogglePin: (id: WallboardWidgetId) => void;
  onDrillDown: (payload: DrillDownPayload) => void;
  isTvMode?: boolean;
}

const PinButton: React.FC<{
  id: WallboardWidgetId;
  pinnedWidgets: WallboardWidgetId[];
  onTogglePin: (id: WallboardWidgetId) => void;
  isTvMode?: boolean;
}> = ({ id, pinnedWidgets, onTogglePin, isTvMode }) => {
  if (isTvMode) return null;
  const isPinned = pinnedWidgets.includes(id);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTogglePin(id);
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
        isPinned
          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30'
          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
      }`}
      title={isPinned ? 'Remover do Painel / Projetor' : 'Fixar este gráfico no Painel / Projetor'}
    >
      <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-emerald-400 text-emerald-400' : ''}`} />
      <span>{isPinned ? 'No Projetor' : 'Fixar no Projetor'}</span>
    </button>
  );
};

export const GlobalKpiStripWidget: React.FC<WidgetCommonProps> = ({
  commercial,
  financial,
  billingHours,
  operational,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Visão Consolidada da Diretoria — 4 Pilares Estratégicos (Clique em qualquer número para Conferência)
          </h3>
        </div>
        <PinButton
          id="kpi_global_strip"
          pinnedWidgets={pinnedWidgets}
          onTogglePin={onTogglePin}
          isTvMode={isTvMode}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Comercial */}
        <div
          onClick={() =>
            onDrillDown({
              title: 'Presupuestos Firmados & Aprovados (Comercial)',
              subtitle: 'Conferência detalhada de propostas comerciais no período filtrado',
              category: 'comercial',
              metricLabel: 'Presupuestos',
              records: commercial.rawRecords.estimaciones,
            })
          }
          className="cursor-pointer group bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 hover:border-amber-400 rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">1. Comercial & Pedidos</span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {formatCompactCurrency(commercial.firmadosValor)}
            <span className="text-xs font-semibold text-amber-300 ml-2">
              ({commercial.firmadosCount} firmados)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Orçado: {formatCompactCurrency(commercial.totalPresupuestosValor)}</span>
            <span className="font-bold text-slate-200">
              {commercial.pedidosGeradosCount} Pedidos ({commercial.perfisSolicitadosCount} perfis)
            </span>
          </div>
        </div>

        {/* Card 2: Financeiro / Cobrança */}
        <div
          onClick={() =>
            onDrillDown({
              title: 'Cobrança & Fluxo de Recebimentos (Financeiro)',
              subtitle: 'Conferência de todos os títulos emitidos, pagos e vencidos',
              category: 'financeiro',
              metricLabel: 'Títulos de Cobrança',
              records: financial.rawRecords.todosTitulos,
            })
          }
          className="cursor-pointer group bg-gradient-to-br from-blue-500/10 via-slate-950 to-slate-950 border border-blue-500/30 hover:border-blue-400 rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">2. Financeiro & Cobrança</span>
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {formatCompactCurrency(financial.recebidoValor)}
            <span className="text-xs font-semibold text-emerald-400 ml-2">Recebido</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>A Vencer: {formatCompactCurrency(financial.aVencerValor)}</span>
            <span className="font-bold text-rose-400">
              Vencido: {formatCompactCurrency(financial.vencidoValor)} ({financial.vencidoCount})
            </span>
          </div>
        </div>

        {/* Card 3: Faturamento & Horas (Matéria-Prima) */}
        <div
          onClick={() =>
            onDrillDown({
              title: 'Faturamento × Horas × Trabalhadores por Cliente',
              subtitle: 'Auditoria da matéria-prima (horas trabalhadas e valor faturado)',
              category: 'faturamento',
              metricLabel: 'Faturamento por Cliente',
              records: billingHours.rawRecords.faturamentoClientes,
            })
          }
          className="cursor-pointer group bg-gradient-to-br from-emerald-500/10 via-slate-950 to-slate-950 border border-emerald-500/30 hover:border-emerald-400 rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              3. Faturamento & Horas
            </span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {formatCompactCurrency(billingHours.totalFaturamentoPeriodo)}
            <span className="text-xs font-semibold text-sky-400 ml-2">
              ({billingHours.totalHorasPeriodo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              {billingHours.totalTrabalhadoresFaturados} Trab. • {billingHours.totalClientesAtendidos} Clientes
            </span>
            <span
              className={`font-bold inline-flex items-center gap-0.5 ${
                billingHours.variacaoFaturamentoMoMPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {billingHours.variacaoFaturamentoMoMPct >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {billingHours.variacaoFaturamentoMoMPct >= 0 ? '+' : ''}
              {billingHours.variacaoFaturamentoMoMPct.toFixed(1)}% vs mês ant.
            </span>
          </div>
        </div>

        {/* Card 4: Operacional / RH & App em Tempo Real */}
        <div
          onClick={() =>
            onDrillDown({
              title: 'Operacional RH: Contratações, Reemplazos e App Realtime',
              subtitle: 'Conferência das alocações, substituições e trabalhadores ativos',
              category: 'operacional',
              metricLabel: 'Movimentações Operacionais',
              records: [
                ...operational.rawRecords.novasContratacoes,
                ...operational.rawRecords.reemplazos,
              ],
            })
          }
          className="cursor-pointer group bg-gradient-to-br from-purple-500/10 via-slate-950 to-slate-950 border border-purple-500/30 hover:border-purple-400 rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              4. Operacional (RH & App)
            </span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {operational.totalTrabalhadoresAtivos}{' '}
            <span className="text-sm font-semibold text-slate-300">Ativos</span>
            <span className="text-xs font-bold text-emerald-400 ml-2">
              +{operational.novasContratacoesPeriodo} novos
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="text-amber-400 font-semibold">
              {operational.reemplazosPeriodo} Reemplazos
            </span>
            <span className="font-bold text-sky-400">
              App: {operational.horasApontadasTempoReal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h apontadas
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ComercialFunnelWidget: React.FC<WidgetCommonProps> = ({
  commercial,
  monthlyEvolution,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              Funil Comercial: Presupuestos, Aprovados, Firmados & Pedidos
            </h3>
            <p className="text-xs text-slate-400">
              Prospecção de novos clientes, propostas aprovadas/firmadas e geração de pedidos
            </p>
          </div>
          <PinButton
            id="comercial_funnel"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        {/* Mini KPIs Comerciais clicáveis */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <button
            onClick={() =>
              onDrillDown({
                title: 'Todos os Presupuestos (Estimaciones)',
                subtitle: 'Propostas comerciais elaboradas no período',
                category: 'comercial',
                metricLabel: 'Presupuestos',
                records: commercial.rawRecords.estimaciones,
              })
            }
            className="text-left p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Presupuestos</span>
            <span className="text-lg font-extrabold text-white">{commercial.totalPresupuestosCount}</span>
            <span className="text-xs text-amber-400 font-semibold block">
              {formatCompactCurrency(commercial.totalPresupuestosValor)}
            </span>
          </button>

          <button
            onClick={() =>
              onDrillDown({
                title: 'Presupuestos Aprovados & Firmados',
                subtitle: 'Propostas aprovadas e convertidas em negócio',
                category: 'comercial',
                metricLabel: 'Firmados',
                records: commercial.rawRecords.firmados,
              })
            }
            className="text-left p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Aprov. / Firmados</span>
            <span className="text-lg font-extrabold text-emerald-400">
              {commercial.aprovadosCount} / {commercial.firmadosCount}
            </span>
            <span className="text-xs text-emerald-300 font-semibold block">
              {formatCompactCurrency(commercial.firmadosValor)} ({commercial.taxaConversaoQtd.toFixed(0)}%)
            </span>
          </button>

          <button
            onClick={() =>
              onDrillDown({
                title: 'Pedidos Gerados & Perfis Demandados',
                subtitle: 'Pedidos ativos gerados para alocação operacional',
                category: 'comercial',
                metricLabel: 'Pedidos',
                records: commercial.rawRecords.pedidos,
              })
            }
            className="text-left p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Pedidos / Perfis</span>
            <span className="text-lg font-extrabold text-sky-400">{commercial.pedidosGeradosCount} ped.</span>
            <span className="text-xs text-slate-300 font-semibold block">
              {commercial.perfisSolicitadosCount} perfis solicitados
            </span>
          </button>

          <button
            onClick={() =>
              onDrillDown({
                title: 'Prospecção: Leads & Novos Clientes',
                subtitle: 'Oportunidades comerciais prospectadas no período',
                category: 'comercial',
                metricLabel: 'Novos Clientes / Leads',
                records: commercial.rawRecords.leads,
              })
            }
            className="text-left p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Novos Clientes</span>
            <span className="text-lg font-extrabold text-purple-400">
              +{commercial.novosClientesConvertidos} clientes
            </span>
            <span className="text-xs text-slate-300 font-semibold block">
              {commercial.novosLeadsCount} leads em prospecção
            </span>
          </button>
        </div>

        {/* Gráfico Mensal Comercial */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyEvolution} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#38bdf8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                }}
                formatter={(val: any, name: string) =>
                  name.includes('€') ? formatCurrency(Number(val)) : val
                }
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar
                yAxisId="left"
                dataKey="presupuestosValor"
                name="Valor Orçado (€)"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Bar
                yAxisId="left"
                dataKey="firmadosValor"
                name="Valor Firmado (€)"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                barSize={16}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="perfisDemandados"
                name="Qtd. Perfis Demandados"
                stroke="#38bdf8"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const ComercialVendedoresWidget: React.FC<WidgetCommonProps> = ({
  commercial,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Performance por Vendedor (Comercial)
            </h3>
            <p className="text-xs text-slate-400">
              Presupuestos, valor firmado, pedidos gerados e quantidade de perfis por vendedor
            </p>
          </div>
          <PinButton
            id="comercial_vendedores"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="overflow-x-auto max-h-[340px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Vendedor</th>
                <th className="py-2.5 px-3 text-center">Presupuestos</th>
                <th className="py-2.5 px-3 text-right">Valor Orçado</th>
                <th className="py-2.5 px-3 text-right">Firmado (€)</th>
                <th className="py-2.5 px-3 text-center">Pedidos / Perfis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {commercial.bySeller.map((s, idx) => (
                <tr
                  key={idx}
                  onClick={() =>
                    onDrillDown({
                      title: `Auditoria Comercial — ${s.vendedor}`,
                      subtitle: 'Presupuestos e pedidos conduzidos por este vendedor',
                      category: 'comercial',
                      metricLabel: s.vendedor,
                      records: [
                        ...commercial.rawRecords.estimaciones.filter((r) => r.vendedor === s.vendedor),
                        ...commercial.rawRecords.pedidos.filter((r) => r.vendedor === s.vendedor),
                      ],
                    })
                  }
                  className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-white">{s.vendedor}</td>
                  <td className="py-2.5 px-3 text-center text-slate-300">
                    {s.presupuestosCount}{' '}
                    <span className="text-[10px] text-emerald-400">({s.firmadosCount} firm.)</span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-300">
                    {formatCompactCurrency(s.presupuestosValor)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-emerald-400">
                    {formatCompactCurrency(s.firmadosValor)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30">
                      {s.pedidosCount} ped • {s.perfisCount} perfis
                    </span>
                  </td>
                </tr>
              ))}
              {commercial.bySeller.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    Sem movimentações para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ComercialPaisesPerfisWidget: React.FC<WidgetCommonProps> = ({
  commercial,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-sky-400" />
              Visão Multi-Sede / País & Quantidade por Perfil
            </h3>
            <p className="text-xs text-slate-400">
              Distribuição geográfica (Espanha, França, Itália, Dubai/EAU) e perfis mais demandados
            </p>
          </div>
          <PinButton
            id="comercial_paises"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        {/* Cards de Países */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
          {commercial.byCountry.map((c) => (
            <button
              key={c.code}
              onClick={() =>
                onDrillDown({
                  title: `Operação Comercial — ${c.flag} ${c.name}`,
                  subtitle: 'Presupuestos e pedidos registrados neste país/sede',
                  category: 'comercial',
                  metricLabel: c.name,
                  records: commercial.rawRecords.estimaciones.filter((r) =>
                    (r.pais || '').includes(c.name)
                  ),
                })
              }
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-sky-500/50 text-left transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">
                  {c.flag} {c.name}
                </span>
                <span className="text-[11px] font-bold text-sky-400">{c.pedidosCount} pedidos</span>
              </div>
              <div className="mt-1.5 text-base font-extrabold text-emerald-400">
                {formatCompactCurrency(c.presupuestosValor)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {c.presupuestosCount} presupuestos • {c.perfisCount} perfis
              </div>
            </button>
          ))}
        </div>

        {/* Top Perfis Demandados */}
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={commercial.byProfile.slice(0, 6)}
              layout="vertical"
              margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
              <YAxis
                dataKey="perfil"
                type="category"
                width={130}
                tick={{ fill: '#e2e8f0', fontSize: 11 }}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="quantidadeOrcada" name="Qtd. em Presupuesto" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey="quantidadePedidos" name="Qtd. em Pedidos" fill="#38bdf8" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const FinanceiroCobrancaStatusWidget: React.FC<WidgetCommonProps> = ({
  financial,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-400" />
              Cobrança: Quantidade, Valor & Performance por Empresa
            </h3>
            <p className="text-xs text-slate-400">
              Visão de títulos recebidos, carteira a vencer e inadimplência por empresa do grupo
            </p>
          </div>
          <PinButton
            id="financeiro_cobranca_status"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <button
            onClick={() =>
              onDrillDown({
                title: 'Títulos Recebidos / Pagos',
                subtitle: 'Conferência de recebimentos liquidados',
                category: 'financeiro',
                metricLabel: 'Recebidos',
                records: financial.rawRecords.recebidos,
              })
            }
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-emerald-300 block">
              Recebido ({financial.recebidoCount} tít.)
            </span>
            <span className="text-lg font-extrabold text-emerald-400">
              {formatCompactCurrency(financial.recebidoValor)}
            </span>
          </button>

          <button
            onClick={() =>
              onDrillDown({
                title: 'Títulos A Vencer (Fluxo Futuro)',
                subtitle: 'Conferência de recebíveis regulares a vencer',
                category: 'financeiro',
                metricLabel: 'A Vencer',
                records: financial.rawRecords.aVencer,
              })
            }
            className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 text-left transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-sky-300 block">
              A Vencer ({financial.aVencerCount} tít.)
            </span>
            <span className="text-lg font-extrabold text-sky-400">
              {formatCompactCurrency(financial.aVencerValor)}
            </span>
          </button>

          <button
            onClick={() =>
              onDrillDown({
                title: 'Cobrança em Atraso / Vencidos',
                subtitle: 'Títulos vencidos pendentes de liquidação',
                category: 'financeiro',
                metricLabel: 'Vencidos',
                records: financial.rawRecords.vencidos,
              })
            }
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:border-rose-400 text-left transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-rose-300 block">
              Vencido ({financial.vencidoCount} tít.)
            </span>
            <span className="text-lg font-extrabold text-rose-400">
              {formatCompactCurrency(financial.vencidoValor)}
            </span>
          </button>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={financial.byCompany} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="empresa" tick={{ fill: '#e2e8f0', fontSize: 11 }} axisLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
                formatter={(v: any) => formatCurrency(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="recebido" name="Recebido (€)" stackId="a" fill="#10b981" barSize={26} />
              <Bar dataKey="aVencer" name="A Vencer (€)" stackId="a" fill="#38bdf8" barSize={26} />
              <Bar dataKey="vencido" name="Vencido (€)" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const FinanceiroCashFlowClientesWidget: React.FC<WidgetCommonProps> = ({
  financial,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Fluxo de Caixa Estratificado por Cliente (Cobrança)
            </h3>
            <p className="text-xs text-slate-400">
              Estratificação por cliente de valores emitidos, recebidos, a vencer e vencidos
            </p>
          </div>
          <PinButton
            id="financeiro_cashflow_clientes"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="overflow-x-auto max-h-[330px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-2">Empresa</th>
                <th className="py-2.5 px-2 text-center">Qtd</th>
                <th className="py-2.5 px-2 text-right">Recebido</th>
                <th className="py-2.5 px-2 text-right">A Vencer</th>
                <th className="py-2.5 px-3 text-right">Vencido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {financial.byClientCashFlow.slice(0, 25).map((cf, i) => (
                <tr
                  key={i}
                  onClick={() =>
                    onDrillDown({
                      title: `Extrato de Cobrança — ${cf.cliente}`,
                      subtitle: `Títulos estratificados de ${cf.cliente} (${cf.empresa})`,
                      category: 'financeiro',
                      metricLabel: cf.cliente,
                      records: financial.rawRecords.todosTitulos.filter((r) => r.cliente === cf.cliente),
                    })
                  }
                  className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-white truncate max-w-[170px]" title={cf.cliente}>
                    {cf.cliente}
                  </td>
                  <td className="py-2.5 px-2 text-slate-400">{cf.empresa}</td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{cf.titulosCount}</td>
                  <td className="py-2.5 px-2 text-right font-semibold text-emerald-400">
                    {formatCompactCurrency(cf.recebido)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-semibold text-sky-400">
                    {formatCompactCurrency(cf.aVencer)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-rose-400">
                    {cf.vencido > 0 ? formatCompactCurrency(cf.vencido) : '—'}
                  </td>
                </tr>
              ))}
              {financial.byClientCashFlow.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Nenhum título encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const FaturamentoEvolucaoAnualWidget: React.FC<WidgetCommonProps> = ({
  billingHours,
  monthlyEvolution,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            Evolução Anual Mês a Mês: Faturamento (€) × Horas Trabalhadas × Trabalhadores
          </h3>
          <p className="text-xs text-slate-400">
            Nossa matéria-prima: cruzamento de horas trabalhadas, efetivo faturado e receita gerada mês a mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onDrillDown({
                title: 'Auditoria de Horas Trabalhadas & Faturamento',
                subtitle: 'Detalhamento de todas as horas e valores apurados por trabalhador e cliente',
                category: 'faturamento',
                metricLabel: 'Faturamento & Horas',
                records: billingHours.rawRecords.horasLancadas,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 border border-slate-700"
          >
            <Eye className="w-3.5 h-3.5" />
            Conferir Lançamentos
          </button>
          <PinButton
            id="faturamento_evolucao_anual"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>
      </div>

      {/* KPIs de Faturamento & Horas com Comparativo Mês a Mês */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Faturamento Período</span>
          <span className="text-lg font-extrabold text-emerald-400">
            {formatCompactCurrency(billingHours.totalFaturamentoPeriodo)}
          </span>
          <span className="text-[11px] text-slate-400 block">
            MoM: {billingHours.variacaoFaturamentoMoMPct >= 0 ? '+' : ''}
            {billingHours.variacaoFaturamentoMoMPct.toFixed(1)}%
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Horas Trabalhadas</span>
          <span className="text-lg font-extrabold text-sky-400">
            {billingHours.totalHorasPeriodo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}h
          </span>
          <span className="text-[11px] text-slate-400 block">
            MoM: {billingHours.variacaoHorasMoMPct >= 0 ? '+' : ''}
            {billingHours.variacaoHorasMoMPct.toFixed(1)}%
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Trabalhadores Faturados</span>
          <span className="text-lg font-extrabold text-white">{billingHours.totalTrabalhadoresFaturados}</span>
          <span className="text-[11px] text-slate-400 block">
            Média {billingHours.mediaHorasPorTrabalhador.toFixed(0)}h / trab.
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Clientes Faturados</span>
          <span className="text-lg font-extrabold text-amber-400">{billingHours.totalClientesAtendidos}</span>
          <span className="text-[11px] text-slate-400 block">Empresas/Obras ativas</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Tarifa Média Hora</span>
          <span className="text-lg font-extrabold text-purple-400">
            {formatCurrency(billingHours.tarifaMediaHora)}/h
          </span>
          <span className="text-[11px] text-slate-400 block">Receita média por hora</span>
        </div>
      </div>

      {/* Gráfico Combinado BI: Faturamento (€) + Horas Trabalhadas + Horas App + Trabalhadores */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={monthlyEvolution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fill: '#e2e8f0', fontSize: 12 }} axisLine={false} />
            <YAxis
              yAxisId="eur"
              tick={{ fill: '#10b981', fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="hrs"
              orientation="right"
              tick={{ fill: '#38bdf8', fontSize: 11 }}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k h`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '12px',
                fontSize: '12px',
              }}
              formatter={(val: any, name: string) => {
                if (name.includes('€')) return formatCurrency(Number(val));
                if (name.includes('Horas')) return `${Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
                return val;
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Bar
              yAxisId="eur"
              dataKey="faturamentoValor"
              name="Faturamento (€)"
              fill="#10b981"
              radius={[6, 6, 0, 0]}
              barSize={28}
            />
            <Line
              yAxisId="hrs"
              type="monotone"
              dataKey="horasTrabalhadas"
              name="Horas Faturadas (h)"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="hrs"
              type="monotone"
              dataKey="horasApontadasApp"
              name="Horas Apontadas no App (h)"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const FaturamentoMatrizClientesWidget: React.FC<WidgetCommonProps> = ({
  billingHours,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Matriz de Faturamento: Cliente × Trabalhadores × Horas
            </h3>
            <p className="text-xs text-slate-400">
              Cruzamento de horas trabalhadas, quantidade de trabalhadores e valor por cliente
            </p>
          </div>
          <PinButton
            id="faturamento_matriz_clientes"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="overflow-x-auto max-h-[330px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-2">Empresa</th>
                <th className="py-2.5 px-2 text-center">Trab.</th>
                <th className="py-2.5 px-2 text-right">Horas (h)</th>
                <th className="py-2.5 px-2 text-right">Tarifa Méd.</th>
                <th className="py-2.5 px-3 text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {billingHours.byClientMatrix.map((c, idx) => (
                <tr
                  key={idx}
                  onClick={() =>
                    onDrillDown({
                      title: `Horas & Faturamento — ${c.cliente}`,
                      subtitle: `${c.trabalhadoresCount} trabalhadores • ${c.horasTotais.toFixed(1)} horas`,
                      category: 'faturamento',
                      metricLabel: c.cliente,
                      records: billingHours.rawRecords.horasLancadas.filter((r) => r.cliente === c.cliente),
                    })
                  }
                  className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-white truncate max-w-[160px]" title={c.cliente}>
                    {c.cliente}
                  </td>
                  <td className="py-2.5 px-2 text-slate-400">{c.empresa}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-amber-400">{c.trabalhadoresCount}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-sky-400">
                    {c.horasTotais.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-300">€{c.tarifaMedia.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-extrabold text-emerald-400">
                    {formatCompactCurrency(c.valorFaturado)}
                  </td>
                </tr>
              ))}
              {billingHours.byClientMatrix.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Sem lançamentos de faturamento/horas no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const OperacionalContratacoesReemplazosWidget: React.FC<WidgetCommonProps> = ({
  operational,
  monthlyEvolution,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              Operacional (RH): Novas Contratações vs Reemplazos (Substituições)
            </h3>
            <p className="text-xs text-slate-400">
              Acompanhamento de contratações iniciais, substituições em obra e baixas
            </p>
          </div>
          <PinButton
            id="operacional_contratacoes_reemplazos"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <button
            onClick={() =>
              onDrillDown({
                title: 'Novas Contratações no Período',
                subtitle: 'Trabalhadores contratados para novas vagas',
                category: 'operacional',
                metricLabel: 'Novas Contratações',
                records: operational.rawRecords.novasContratacoes,
              })
            }
            className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400 text-left transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-emerald-300 block">Novas Contratações</span>
            <span className="text-xl font-extrabold text-emerald-400">
              {operational.novasContratacoesPeriodo}
            </span>
          </button>

          <button
            onClick={() =>
              onDrillDown({
                title: 'Reemplazos (Substituições)',
                subtitle: 'Substituições de trabalhadores realizadas no período',
                category: 'operacional',
                metricLabel: 'Reemplazos',
                records: operational.rawRecords.reemplazos,
              })
            }
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 text-left transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-amber-300 block">
              Reemplazos ({operational.taxaSubstituicaoPct.toFixed(0)}%)
            </span>
            <span className="text-xl font-extrabold text-amber-400">{operational.reemplazosPeriodo}</span>
          </button>

          <button
            onClick={() =>
              onDrillDown({
                title: 'Baixas / Desistências',
                subtitle: 'Encerramentos ou desistências registrados',
                category: 'operacional',
                metricLabel: 'Baixas',
                records: operational.rawRecords.baixas,
              })
            }
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:border-rose-400 text-left transition-all"
          >
            <span className="text-[10px] font-bold uppercase text-rose-300 block">
              Baixas / Desist. (Ret. {operational.taxaRetencaoPct.toFixed(0)}%)
            </span>
            <span className="text-xl font-extrabold text-rose-400">
              {operational.baixasDesistenciasPeriodo}
            </span>
          </button>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyEvolution} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="monthLabel" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="novasContratacoes" name="Novas Contratações" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="reemplazos" name="Reemplazos (Substituições)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="baixasDesistencias" name="Baixas / Desistências" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const OperacionalAppHorasRealtimeWidget: React.FC<WidgetCommonProps> = ({
  operational,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  const pieData = [
    { name: 'Validadas', value: operational.folhasValidadasCount, color: '#10b981' },
    { name: 'Enviadas no App', value: operational.folhasEnviadasCount, color: '#38bdf8' },
    { name: 'Apontando / Pendentes', value: Math.max(1, operational.folhasPendentesCount), color: '#f59e0b' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-400" />
              Apontamento de Horas no Aplicativo (Tempo Real)
            </h3>
            <p className="text-xs text-slate-400">
              Volume de horas apontadas pelos colaboradores no Portal/App conforme trabalham
            </p>
          </div>
          <PinButton
            id="operacional_app_horas_realtime"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div className="space-y-3">
            <div
              onClick={() =>
                onDrillDown({
                  title: 'Horas Apontadas no Aplicativo em Tempo Real',
                  subtitle: 'Colaboradores que já lançaram horas diárias pelo telemóvel',
                  category: 'operacional',
                  metricLabel: 'Apontamentos App',
                  records: operational.rawRecords.apontamentosApp,
                })
              }
              className="p-4 rounded-xl bg-gradient-to-r from-sky-500/15 to-purple-500/10 border border-sky-500/30 hover:border-sky-400 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-sky-300">Horas Apontadas no App</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE
                </span>
              </div>
              <div className="text-3xl font-extrabold text-white mt-1">
                {operational.horasApontadasTempoReal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h
              </div>
              <div className="text-xs text-slate-300 mt-1">
                {operational.trabalhadoresApontandoApp} colaboradores com apontamento ativo
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-emerald-400 font-bold block">Validadas</span>
                <span className="text-base font-extrabold text-white">{operational.folhasValidadasCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-sky-400 font-bold block">Enviadas</span>
                <span className="text-base font-extrabold text-white">{operational.folhasEnviadasCount}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-amber-400 font-bold block">Em Apont.</span>
                <span className="text-base font-extrabold text-white">{operational.folhasPendentesCount}</span>
              </div>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={4}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OperacionalClientesAlocacaoWidget: React.FC<WidgetCommonProps> = ({
  operational,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Efetivo em Obra, Contratações & Reemplazos por Cliente
            </h3>
            <p className="text-xs text-slate-400">
              Visão operacional por cliente: trabalhadores ativos, novas contratações, substituições e horas App
            </p>
          </div>
          <PinButton
            id="operacional_clientes_alocacao"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="overflow-x-auto max-h-[320px]">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-2">Empresa</th>
                <th className="py-2.5 px-2 text-center">Ativos</th>
                <th className="py-2.5 px-2 text-center">Novas</th>
                <th className="py-2.5 px-2 text-center">Reemplazos</th>
                <th className="py-2.5 px-3 text-right">Horas App</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {operational.byClientOperations.slice(0, 25).map((c, idx) => (
                <tr
                  key={idx}
                  onClick={() =>
                    onDrillDown({
                      title: `Efetivo & Contratações — ${c.cliente}`,
                      subtitle: `Trabalhadores ativos e movimentações em ${c.cliente}`,
                      category: 'operacional',
                      metricLabel: c.cliente,
                      records: [
                        ...operational.rawRecords.ativos.filter((r) => r.cliente === c.cliente),
                        ...operational.rawRecords.novasContratacoes.filter((r) => r.cliente === c.cliente),
                        ...operational.rawRecords.reemplazos.filter((r) => r.cliente === c.cliente),
                      ],
                    })
                  }
                  className="hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-bold text-white truncate max-w-[160px]" title={c.cliente}>
                    {c.cliente}
                  </td>
                  <td className="py-2.5 px-2 text-slate-400">{c.empresa}</td>
                  <td className="py-2.5 px-2 text-center font-extrabold text-white">{c.ativos}</td>
                  <td className="py-2.5 px-2 text-center font-bold text-emerald-400">
                    {c.novasContratacoes > 0 ? `+${c.novasContratacoes}` : '0'}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-amber-400">
                    {c.reemplazos > 0 ? c.reemplazos : '0'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-sky-400">
                    {c.horasApp > 0 ? `${c.horasApp.toFixed(1)}h` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ComunicacaoWhatsappAppWidget: React.FC<WidgetCommonProps> = ({
  operational,
  pinnedWidgets,
  onTogglePin,
  onDrillDown,
  isTvMode,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Comunicação (WhatsApp / Portal App) & Seguridade Social
            </h3>
            <p className="text-xs text-slate-400">
              Controle de 300 a 700 funcionários: comunicação integrada e conformidade de Seguridade Social
            </p>
          </div>
          <PinButton
            id="comunicacao_whatsapp_app"
            pinnedWidgets={pinnedWidgets}
            onTogglePin={onTogglePin}
            isTvMode={isTvMode}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div
            onClick={() =>
              onDrillDown({
                title: 'Trabalhadores Ativos & Status de Seguridade',
                subtitle: 'Conferência completa do efetivo ativo e situação na Seguridade Social',
                category: 'operacional',
                metricLabel: 'Efetivo Ativo',
                records: operational.rawRecords.ativos,
              })
            }
            className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all"
          >
            <span className="text-[11px] font-bold uppercase text-emerald-400 block">
              Alta na Seguridade Social
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {operational.altasSeguridadeAtivas}
              <span className="text-xs text-slate-400 font-normal ml-1.5">
                / {operational.totalTrabalhadoresAtivos} ativos
              </span>
            </div>
            <span className="text-xs text-amber-400 mt-1 block">
              {operational.emRegularizacaoSeguridade} em trâmite / regularização
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
            <span className="text-[11px] font-bold uppercase text-sky-400 block">
              Comunicação Portal & WhatsApp
            </span>
            <div className="text-2xl font-extrabold text-white mt-1">
              {operational.mensagensAppWhatsappCount}
              <span className="text-xs text-emerald-400 font-semibold ml-1.5">interações</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">
              Base total cadastrada: {operational.totalTrabalhadoresBase} colaboradores
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                Rastreabilidade Multi-Sede (Espanha 🇪🇸 • França 🇫🇷 • Itália 🇮🇹 • Dubai 🇦🇪)
              </div>
              <div className="text-[11px] text-slate-300">
                Todos os indicadores sincronizados em tempo real com o App do Trabalhador e módulos MCS
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RenderWallboardWidget: React.FC<
  WidgetCommonProps & { widgetId: WallboardWidgetId }
> = (props) => {
  switch (props.widgetId) {
    case 'kpi_global_strip':
      return <GlobalKpiStripWidget {...props} />;
    case 'comercial_funnel':
      return <ComercialFunnelWidget {...props} />;
    case 'comercial_vendedores':
      return <ComercialVendedoresWidget {...props} />;
    case 'comercial_paises':
      return <ComercialPaisesPerfisWidget {...props} />;
    case 'financeiro_cobranca_status':
      return <FinanceiroCobrancaStatusWidget {...props} />;
    case 'financeiro_cashflow_clientes':
      return <FinanceiroCashFlowClientesWidget {...props} />;
    case 'faturamento_evolucao_anual':
      return <FaturamentoEvolucaoAnualWidget {...props} />;
    case 'faturamento_matriz_clientes':
      return <FaturamentoMatrizClientesWidget {...props} />;
    case 'operacional_contratacoes_reemplazos':
      return <OperacionalContratacoesReemplazosWidget {...props} />;
    case 'operacional_app_horas_realtime':
      return <OperacionalAppHorasRealtimeWidget {...props} />;
    case 'operacional_clientes_alocacao':
      return <OperacionalClientesAlocacaoWidget {...props} />;
    case 'comunicacao_whatsapp_app':
      return <ComunicacaoWhatsappAppWidget {...props} />;
    default:
      return null;
  }
};
