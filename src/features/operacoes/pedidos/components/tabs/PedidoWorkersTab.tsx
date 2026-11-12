import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Users,
  Home,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  UserMinus,
  Bed,
  MapPin,
  Phone,
  Shirt,
  Car,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Calendar,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Pedido, PedidoSummaryMetrics, PedidoWorkerEntry } from '../../types';

interface Props {
  pedido: Pedido;
  summary: PedidoSummaryMetrics;
  compact?: boolean;
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

export function PedidoWorkersTab({ pedido, summary, compact = false }: Props) {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<'all' | 'active_entering' | 'entering' | 'exited' | 'pending_housing'>('all');
  const [search, setSearch] = useState('');

  const workers = summary?.workers || [];
  const alojamentos = summary?.alojamentos || [];

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter(w => {
      if (filterType === 'active_entering' && w.movement_type === 'exited') return false;
      if (filterType === 'entering' && w.movement_type !== 'entering') return false;
      if (filterType === 'exited' && w.movement_type !== 'exited' && w.movement_type !== 'exiting') return false;
      if (filterType === 'pending_housing' && (w.housing || w.movement_type === 'exited' || !w.requires_housing)) return false;

      if (!q) return true;
      return (
        w.nome.toLowerCase().includes(q) ||
        w.cod_colab.toLowerCase().includes(q) ||
        (w.nif || '').toLowerCase().includes(q) ||
        w.funcao.toLowerCase().includes(q) ||
        (w.housing?.alojamento_nome || '').toLowerCase().includes(q) ||
        (w.housing?.alojamento_codigo || '').toLowerCase().includes(q) ||
        (w.housing?.municipio || '').toLowerCase().includes(q)
      );
    });
  }, [workers, filterType, search]);

  const activeAndEnteringCount = summary.activeWorkersCount + summary.enteringWorkersCount;
  const exitingAndExitedCount = summary.exitingWorkersCount + summary.exitedWorkersCount;

  return (
    <div className="space-y-5">
      {/* 1. Seção de Alojamentos Vinculados à Equipe do Pedido */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-indigo-50/70 via-slate-50/50 to-white dark:from-indigo-950/30 dark:via-slate-900/50 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 py-3.5 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Home className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              Alojamentos & Hospedagem da Equipe ({summary.housedWorkersCount} alojado{summary.housedWorkersCount !== 1 ? 's' : ''})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Imóveis e camas onde os trabalhadores alocados neste pedido estão hospedados atualmente.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {summary.pendingHousingCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                <AlertCircle className="h-3.5 w-3.5" />
                {summary.pendingHousingCount} pendente{summary.pendingHousingCount > 1 ? 's' : ''} de alojamento
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/logistica/alocacao')}
              className="h-8 text-xs border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            >
              Abrir Painel de Logística <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {alojamentos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {alojamentos.map(aloj => {
                const alojWorkers = workers.filter(
                  w =>
                    w.movement_type !== 'exited' &&
                    w.housing &&
                    (w.housing.alojamento_id === aloj.id ||
                      w.housing.alojamento_codigo === aloj.codigo ||
                      w.housing.alojamento_nome === aloj.nome)
                );

                return (
                  <div
                    key={aloj.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 flex flex-col justify-between gap-2.5 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-2 rounded-lg bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Home className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {aloj.codigo ? `${aloj.codigo} • ` : ''}
                              {aloj.nome}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {aloj.municipio || 'Espanha'}
                                {aloj.endereco ? ` — ${aloj.endereco}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                          {aloj.workersCount} colab.
                        </span>
                      </div>

                      {alojWorkers.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 space-y-1.5">
                          {alojWorkers.map(aw => (
                            <div key={aw.assignment_id} className="flex items-center justify-between text-xs gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 shrink-0">
                                  {aw.cod_colab}
                                </span>
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{aw.nome}</span>
                              </div>
                              {aw.housing?.cama_identificador && (
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                                  <Bed className="h-3 w-3 text-slate-400" />
                                  {aw.housing.cama_identificador}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-slate-400" />
                <span>
                  {summary.includesHousing
                    ? 'O pedido inclui alojamento, mas nenhum trabalhador ativo possui cama/alojamento vinculado no momento.'
                    : 'Nenhum alojamento registrado para os trabalhadores deste pedido.'}
                </span>
              </div>
              {activeAndEnteringCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/logistica/alocacao')}
                  className="h-7 text-xs shrink-0"
                >
                  Alocar em Alojamento
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Galeria de Trabalhadores do Pedido (Entradas, Ativos & Saídas) com Scroll Interno e Header Fixo */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800 py-3.5 px-5 space-y-3 bg-white dark:bg-slate-900">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Galeria de Trabalhadores do Pedido (Entrando, Em Obra & Saindo)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Acompanhe quem está ativo na obra, quem está entrando (mobilização/reemplazo) e o histórico de saídas, baixas e desistências.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/personal/contratacao')}
                className="h-8 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Contratação Inicial / Alocar Vagas
              </Button>
            </div>
          </div>

          {/* Filter Pills + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Todos ({workers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('active_entering')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  filterType === 'active_entering'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300'
                }`}
              >
                <UserCheck className="h-3 w-3" /> Em Obra / Ativos ({activeAndEnteringCount})
              </button>
              {summary.enteringWorkersCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType('entering')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                    filterType === 'entering'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300'
                  }`}
                >
                  <ArrowUpRight className="h-3 w-3" /> Entrando ({summary.enteringWorkersCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterType('exited')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  filterType === 'exited'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300'
                }`}
              >
                <ArrowDownRight className="h-3 w-3" /> Saídas / Substituídos ({exitingAndExitedCount})
              </button>
              {summary.pendingHousingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType('pending_housing')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                    filterType === 'pending_housing'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  <AlertCircle className="h-3 w-3" /> Sem Alojamento ({summary.pendingHousingCount})
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar trabalhador, código ou alojamento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        {/* Scrollable Inner Table with Sticky Header */}
        <CardContent className="p-0">
          {filteredWorkers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum trabalhador encontrado para o filtro selecionado neste pedido.
            </div>
          ) : (
            <div className={`${compact ? 'max-h-[420px]' : 'max-h-[540px]'} overflow-y-auto overflow-x-auto`}>
              <table className="w-full text-xs md:text-sm text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Trabalhador</th>
                    <th className="px-4 py-2.5 font-semibold">Função / Perfil & Condições</th>
                    <th className="px-4 py-2.5 font-semibold">Movimentação (Entrada / Saída)</th>
                    <th className="px-4 py-2.5 font-semibold">Datas (Entrada / Saída)</th>
                    <th className="px-4 py-2.5 font-semibold">Alojamento & Cama</th>
                    <th className="px-4 py-2.5 font-semibold">Contato & EPI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredWorkers.map(w => {
                    const isExited = w.movement_type === 'exited';
                    const isEntering = w.movement_type === 'entering';
                    const isExiting = w.movement_type === 'exiting';

                    return (
                      <tr
                        key={w.assignment_id}
                        className={`transition-colors ${
                          isExited
                            ? 'bg-rose-50/20 dark:bg-rose-950/10 text-slate-500'
                            : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* 1. Trabalhador */}
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shrink-0">
                              {w.cod_colab}
                            </span>
                            <div>
                              <div className={`font-bold ${isExited ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                {w.nome}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                                {w.nif && <span>Doc: {w.nif}</span>}
                                {w.status_trabajador && (
                                  <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-medium">
                                    RH: {w.status_trabajador}
                                  </span>
                                )}
                                {w.status_seguridad && (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
                                    SS: {w.status_seguridad}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Função & Tarifa */}
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{w.funcao}</div>
                          {w.tarifa_acordada ? (
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              Tarifa Acordada: {w.tarifa_acordada.toFixed(2)} €/h
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground mt-0.5">Tarifa padrão da vaga</div>
                          )}
                        </td>

                        {/* 3. Movimentação (Entrada / Saída / Substituição) */}
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1">
                            {isEntering ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                <ArrowUpRight className="h-3.5 w-3.5" /> {w.movement_label}
                              </span>
                            ) : isExiting ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <ArrowDownRight className="h-3.5 w-3.5" /> {w.movement_label}
                              </span>
                            ) : isExited ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <UserMinus className="h-3.5 w-3.5" /> {w.movement_label}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <UserCheck className="h-3.5 w-3.5" /> {w.movement_label}
                              </span>
                            )}

                            {w.replaced_worker_name && (
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                ↳ Entrou no lugar de: <strong>{w.replaced_worker_name}</strong>
                              </div>
                            )}
                            {w.replaced_by_worker_name && (
                              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                ↳ Substituído por: <strong>{w.replaced_by_worker_name}</strong>
                              </div>
                            )}
                            {w.solicitud_codigo && (
                              <div className="text-[11px] text-muted-foreground">
                                Solicitude GSO: <strong className="text-slate-700 dark:text-slate-300">{w.solicitud_codigo}</strong>
                              </div>
                            )}
                            {w.exit_reason && (
                              <div className="text-[11px] text-muted-foreground max-w-[240px] truncate" title={w.exit_reason}>
                                Obs/Motivo: {w.exit_reason}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 4. Datas */}
                        <td className="px-4 py-3 align-top whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs text-slate-800 dark:text-slate-200">
                            <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="text-muted-foreground">Entrada:</span>
                            <strong>{formatSafeDate(w.planned_start_date || w.start_date)}</strong>
                          </div>
                          {(w.end_date || w.data_baixa) && (
                            <div className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 mt-1">
                              <Calendar className="h-3.5 w-3.5 shrink-0" />
                              <span>Saída/Baixa:</span>
                              <strong>{formatSafeDate(w.end_date || w.data_baixa)}</strong>
                            </div>
                          )}
                        </td>

                        {/* 5. Alojamento & Cama */}
                        <td className="px-4 py-3 align-top">
                          {w.housing ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200/70 dark:border-indigo-800">
                                <Home className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  {w.housing.alojamento_codigo ? `${w.housing.alojamento_codigo} • ` : ''}
                                  {w.housing.alojamento_nome}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {w.housing.cama_identificador && (
                                  <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                    <Bed className="h-3 w-3 text-indigo-500" /> {w.housing.cama_identificador}
                                  </span>
                                )}
                                {w.housing.municipio && <span>📍 {w.housing.municipio}</span>}
                                {w.housing.data_checkin && <span>Check-in: {formatSafeDate(w.housing.data_checkin)}</span>}
                              </div>
                            </div>
                          ) : isExited ? (
                            <span className="text-xs text-muted-foreground">Desalocado / Saiu</span>
                          ) : w.requires_housing ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Pendente Alojamento
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Não requer alojamento
                            </span>
                          )}
                        </td>

                        {/* 6. Contato & EPI */}
                        <td className="px-4 py-3 align-top">
                          <div className="space-y-1 text-xs">
                            {w.movil ? (
                              <div className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                                <Phone className="h-3 w-3 text-slate-400" /> {w.movil}
                              </div>
                            ) : (
                              <div className="text-muted-foreground">Sem telefone</div>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              {(w.camiseta || w.pantalones) && (
                                <span className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  <Shirt className="h-3 w-3" /> {w.camiseta || '-'} / {w.pantalones || '-'}
                                </span>
                              )}
                              {w.licencia_conducir && (
                                <span className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  <Car className="h-3 w-3" /> CNH: {w.licencia_conducir}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
