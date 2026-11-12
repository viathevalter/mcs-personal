import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PedidoStatusBadge } from '../PedidoStatusBadge';
import { formatCurrency } from '@/shared/utils/currency';
import { format } from 'date-fns';
import type { Pedido, PedidoItem, PedidoSummaryMetrics } from '../../types';
import { usePedidoFinanceAccess } from '../../hooks/usePedidoFinanceAccess';
import { PedidoWorkersTab } from './PedidoWorkersTab';
import {
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  Info,
  Building2,
  Briefcase,
  DollarSign,
  ExternalLink,
} from 'lucide-react';

interface Props {
  pedido: Pedido;
  items?: PedidoItem[];
  summary?: PedidoSummaryMetrics;
}

export function PedidoOverviewTab({ pedido, items = [], summary }: Props) {
  const navigate = useNavigate();
  const { hasFinanceAccess } = usePedidoFinanceAccess();

  const getDayOfWeekName = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const clean = String(dateStr).split('T')[0];
      const date = new Date(clean + 'T00:00:00');
      if (isNaN(date.getTime())) return '';
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    } catch {
      return '';
    }
  };

  const formatSafeDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const clean = String(dateStr).split('T')[0];
      return format(new Date(clean + 'T00:00:00'), 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const getDurationString = () => {
    if (!pedido.expected_start_date || !pedido.expected_end_date) return 'Não especificado';
    try {
      const start = new Date(String(pedido.expected_start_date).split('T')[0] + 'T00:00:00');
      const end = new Date(String(pedido.expected_end_date).split('T')[0] + 'T00:00:00');
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;

      if (months > 0) {
        return `${months} ${months === 1 ? 'mês' : 'meses'}${remainingDays > 0 ? ` e ${remainingDays} dias` : ''}`;
      }
      return `${diffDays} dias`;
    } catch {
      return 'Não especificado';
    }
  };

  const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(val));

  const commercialName =
    pedido.commercial_owner?.display_name ||
    pedido.commercial_owner?.email ||
    (!isUuid(pedido.commercial_owner_id) && pedido.commercial_owner_id) ||
    'Equipe Comercial';

  const operationalName =
    pedido.responsible_user?.display_name ||
    pedido.responsible_user?.email ||
    (!isUuid(pedido.responsible_id) && pedido.responsible_id) ||
    'Coordenação de Operações';

  const defaultSummary: PedidoSummaryMetrics = summary || {
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

  return (
    <div className="space-y-5 pt-4">
      {/* 1. TRABALHADORES DO PEDIDO (ENTRANDO / ATIVOS / SAINDO) & ALOJAMENTOS EM DESTAQUE IMEDIATO */}
      <PedidoWorkersTab pedido={pedido} summary={defaultSummary} compact />

      {/* 2. GRID EXECUTIVO EM 3 COLUNAS: INFORMAÇÕES GERAIS, OBRA/CONTATO E CRONOGRAMA/FINANCEIRO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna 1: Informações Gerais & Perfis Solicitados */}
        <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Informações Gerais & Vagas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código</p>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{pedido.codigo}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Empresa</p>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  {pedido.empresa?.trade_name || pedido.empresa?.nome || '-'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cliente</p>
                <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">
                  {pedido.client?.trade_name || pedido.client?.legal_name || 'Desconhecido'}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status Comercial</p>
                <div className="mt-1">
                  <PedidoStatusBadge type="commercial" status={pedido.commercial_status} />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status Operacional</p>
                <div className="mt-1">
                  <PedidoStatusBadge type="operational" status={pedido.operational_status} />
                </div>
              </div>
            </div>

            {/* Resumo das Vagas por Perfil */}
            {items.length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> Perfis Solicitados ({defaultSummary.fulfilled}/{defaultSummary.requested} preenchidos)
                </p>
                <div className="space-y-1">
                  {items.map(it => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800"
                    >
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {it.job_function?.name || it.job_function_name_snapshot || 'Perfil'}
                      </span>
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          it.quantity_fulfilled >= it.quantity_requested
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {it.quantity_fulfilled} / {it.quantity_requested}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Origem da Estimación */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Origem Comercial (Estimación)</p>
              {pedido.source_estimacion_id ? (
                <button
                  type="button"
                  onClick={() => navigate(`/comercial/estimaciones/${pedido.source_estimacion_id}`)}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {pedido.source_estimacion?.codigo
                    ? `Presupuesto ${pedido.source_estimacion.codigo}`
                    : `Ver Estimación (${pedido.source_estimacion_id.slice(0, 8)}...)`}
                  <ExternalLink className="h-3 w-3" />
                </button>
              ) : (
                <p className="text-xs text-muted-foreground">Criação Direta</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coluna 2: Obra / Localização e Contatos */}
        <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="border-b py-3 px-4">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-indigo-500" />
              Obra / Localização e Contato Local
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3.5 text-xs">
            {pedido.client_site ? (
              <>
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Identificação da Obra</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-white">{pedido.client_site.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Endereço</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {pedido.client_site.address_line || 'Endereço não cadastrado'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cidade</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{pedido.client_site.city || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Código Postal</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{pedido.client_site.postal_code || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider block">
                    Pessoa de Contato na Obra
                  </span>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {pedido.client_site.contact_name || 'Não especificado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {pedido.client_site.contact_phone || pedido.client?.phone || 'Não especificado'}
                    </span>
                  </div>
                  {(pedido.client_site.contact_email || pedido.client?.email) && (
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 break-all">
                        {pedido.client_site.contact_email || pedido.client?.email}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma obra específica vinculada a este pedido.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 3: Cronograma, Responsáveis & Financeiro */}
        <div className="space-y-4">
          {/* Cronograma e Responsáveis */}
          <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b py-3 px-4">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-500" />
                Cronograma & Responsáveis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gradient-to-r from-blue-50/60 to-emerald-50/40 dark:from-slate-900 dark:to-slate-900 p-3 rounded-lg border border-slate-200/70 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Início Previsto</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatSafeDate(pedido.expected_start_date)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {pedido.expected_start_date ? getDayOfWeekName(pedido.expected_start_date) : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Fim Previsto</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatSafeDate(pedido.expected_end_date)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Duração: {getDurationString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Responsável Comercial</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={commercialName}>
                    {commercialName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Coord. Operacional</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={operationalName}>
                    {operationalName}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Snapshot Financeiro */}
          {hasFinanceAccess && (
            <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="border-b py-3 px-4">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  Snapshot Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Receita Total Prevista:</span>
                  <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(pedido.total_revenue_snapshot || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Custo Base Estimado:</span>
                  <span className="font-bold text-sm text-rose-600 dark:text-rose-400">
                    {formatCurrency(pedido.total_cost_snapshot || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Margem Bruta (%):</span>
                  <span
                    className={`font-bold text-sm px-2 py-0.5 rounded-full ${
                      (pedido.margin_percent_snapshot || 0) >= 20
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {pedido.margin_percent_snapshot || 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 3. OBSERVAÇÕES E HISTÓRICO DE NOTAS DO PEDIDO */}
      <Card className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="border-b py-3 px-4">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            Observações e Histórico de Anotações do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {pedido.notes ? (
            <p className="text-xs md:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {pedido.notes}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Nenhuma observação cadastrada para este pedido. Clique em "Editar Pedido" no cabeçalho para adicionar instruções.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
