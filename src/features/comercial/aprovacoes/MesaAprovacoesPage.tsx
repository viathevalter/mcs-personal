import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useEstimacionMutations } from '../estimaciones/hooks/useEstimacionMutations';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  ExternalLink,
  MessageSquare,
  Building2,
  TrendingDown,
  Coins,
  FileText,
  User,
  RefreshCw,
  Eye,
  Calendar,
  List,
  LayoutGrid,
  Receipt,
  CreditCard,
  DollarSign,
  Info,
  Check,
  X,
  ChevronRight,
  History,
  RotateCcw,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { parseEuroNumber } from '@/features/financeiro/lib/utils';

export function MesaAprovacoesPage() {
  const navigate = useNavigate();
  const { selectedEmpresaId, role, empresas = [] } = useEmpresa();
  const { decidirAprovacaoGerente, reabrirAnaliseGerente } = useEstimacionMutations();

  const [statusTab, setStatusTab] = useState<'pending' | 'rejected' | 'approved' | 'all_resolved'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState<string>(selectedEmpresaId || 'all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedEstimacion, setSelectedEstimacion] = useState<any | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
  const [decisionNotes, setDecisionNotes] = useState('');

  // Modal para reabertura de orçamento para a fila de análise
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  const [reopenNotes, setReopenNotes] = useState('');

  // Modal para detalhamento financeiro do cliente
  const [financialModalData, setFinancialModalData] = useState<{ clientName: string; financial: any } | null>(null);

  useEffect(() => {
    if (selectedEmpresaId && selectedEmpresaId !== 'all') {
      setEmpresaFilter(selectedEmpresaId);
    }
  }, [selectedEmpresaId]);

  // Consulta de orçamentos (pendentes de review, rejeitados ou aprovados pelo gerente)
  const { data: allEstimaciones = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['aprovacoes-comerciais', empresaFilter, selectedEmpresaId],
    queryFn: async () => {
      let query = supabase
        .schema('core_comercial')
        .from('estimaciones')
        .select(`
          *,
          current_version:estimacion_versions!fk_estimacion_current_version(
            id,
            version_number,
            total_cost,
            total_revenue,
            margin_percent,
            status,
            items:estimacion_items(
              id,
              quantity,
              sell_rate_hour,
              minimum_sell_rate_hour,
              job_function:job_functions(id, name)
            )
          )
        `)
        .or('status.eq.review,status.eq.rejected,is_approved_by_manager.eq.true,reviewed_at.not.is.null')
        .order('created_at', { ascending: false });

      if (empresaFilter && empresaFilter !== 'all') {
        query = query.eq('empresa_id', empresaFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro na query de aprovações comerciais:', error);
        throw error;
      }
      if (!data || data.length === 0) return [];

      const clientIds = [...new Set(data.map(d => d.client_id).filter(Boolean))];
      const leadIds = [...new Set(data.map(d => d.lead_id).filter(Boolean))];
      const userIds = [
        ...new Set([
          ...data.map(d => d.created_by),
          ...data.map(d => d.reviewed_by),
        ].filter(Boolean))
      ];

      const [
        { data: clients },
        { data: leads },
        { data: users }
      ] = await Promise.all([
        clientIds.length > 0
          ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, financial_status, codigo').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        leadIds.length > 0
          ? supabase.schema('core_comercial').from('leads').select('id, name, company_name').in('id', leadIds)
          : Promise.resolve({ data: [] }),
        userIds.length > 0
          ? supabase.schema('core_operacoes').from('mcs_users').select('id, email, display_name').in('id', userIds)
          : Promise.resolve({ data: [] }),
      ]);

      // Enriquecer dados financeiros (contas_receber) para os clientes
      const clientFinancialMap: Record<string, any> = {};
      if (clients && clients.length > 0) {
        await Promise.all(
          clients.map(async (client: any) => {
            try {
              let q = supabase
                .from('contas_receber')
                .select('id, empresa, cliente, cod_cliente, num_doc, periodo_fat, data_emissao, dt_venc, dt_recebimento, valot_total, saldo_a_pagar, status')
                .order('id', { ascending: false })
                .limit(20);

              if (client.codigo) {
                q = q.or(`cod_cliente.eq.${client.codigo},cliente.ilike.%${client.trade_name || client.legal_name}%`);
              } else {
                q = q.ilike('cliente', `%${client.trade_name || client.legal_name}%`);
              }

              const { data: crRows } = await q;
              if (crRows && crRows.length > 0) {
                let totalFaturado = 0;
                let totalSaldoAberto = 0;
                let totalVencido = 0;
                let faturasVencidas = 0;
                const now = new Date();

                for (const row of crRows) {
                  const total = parseEuroNumber(row.valot_total);
                  const saldo = parseEuroNumber(row.saldo_a_pagar);
                  totalFaturado += total;
                  totalSaldoAberto += saldo;

                  const isPago = row.status === 'Pago' || saldo <= 0;
                  if (!isPago && row.dt_venc) {
                    const vencDate = new Date(row.dt_venc);
                    if (vencDate < now) {
                      totalVencido += saldo;
                      faturasVencidas++;
                    }
                  }
                }

                const ultimaFatura = crRows[0] || null;
                const ultimosPagamentos = crRows.filter(r => r.status === 'Pago' || (r.dt_recebimento && r.dt_recebimento !== null)).slice(0, 3);

                clientFinancialMap[client.id] = {
                  invoices: crRows,
                  totalFaturado,
                  totalSaldoAberto,
                  totalVencido,
                  faturasVencidas,
                  totalInvoicesCount: crRows.length,
                  ultimaFatura,
                  ultimosPagamentos,
                  hasDebt: totalVencido > 0,
                  isUpToDate: totalVencido === 0 && totalSaldoAberto === 0,
                  statusLabel: totalVencido > 0 
                    ? 'Em Atraso' 
                    : totalSaldoAberto > 0 
                      ? 'A Vencer' 
                      : 'Em Dia',
                };
              } else {
                clientFinancialMap[client.id] = {
                  invoices: [],
                  totalFaturado: 0,
                  totalSaldoAberto: 0,
                  totalVencido: 0,
                  faturasVencidas: 0,
                  totalInvoicesCount: 0,
                  ultimaFatura: null,
                  ultimosPagamentos: [],
                  hasDebt: false,
                  isUpToDate: true,
                  statusLabel: 'Sem Histórico',
                };
              }
            } catch (err) {
              console.warn('Erro ao carregar dados financeiros do cliente:', client.id, err);
            }
          })
        );
      }

      return data.map(est => ({
        ...est,
        client: clients?.find((c: any) => c.id === est.client_id),
        lead: leads?.find((l: any) => l.id === est.lead_id),
        seller: users?.find((u: any) => u.id === est.created_by),
        reviewer: users?.find((u: any) => u.id === est.reviewed_by),
        empresa: empresas.find(e => e.id === est.empresa_id),
        financial: est.client_id ? clientFinancialMap[est.client_id] : null,
      }));
    },
    enabled: !!selectedEmpresaId,
  });

  // Categorização de status
  const isItemPending = (est: any) => est.status === 'review';
  const isItemRejected = (est: any) => est.status === 'rejected' || (!est.is_approved_by_manager && !!est.reviewed_at);
  const isItemApproved = (est: any) => Boolean(est.is_approved_by_manager);

  const pendingEstimaciones = allEstimaciones.filter(isItemPending);
  const rejectedEstimaciones = allEstimaciones.filter(isItemRejected);
  const approvedEstimaciones = allEstimaciones.filter(isItemApproved);
  const resolvedEstimaciones = allEstimaciones.filter(est => isItemRejected(est) || isItemApproved(est));

  // Identificar orçamentos rejeitados cujos clientes agora estão com financeiro regularizado
  const regularizedRejected = rejectedEstimaciones.filter(
    est => est.financial?.isUpToDate && est.financial?.totalInvoicesCount > 0
  );
  const regularizedRejectedCount = regularizedRejected.length;

  // Lista da aba ativa
  const currentTabEstimaciones = (() => {
    switch (statusTab) {
      case 'pending':
        return pendingEstimaciones;
      case 'rejected':
        return rejectedEstimaciones;
      case 'approved':
        return approvedEstimaciones;
      case 'all_resolved':
        return resolvedEstimaciones;
      default:
        return pendingEstimaciones;
    }
  })();

  // Filtragem local por termo de busca
  const filteredEstimaciones = currentTabEstimaciones.filter((est: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const code = (est.codigo || '').toLowerCase();
    const clientName = (est.client?.trade_name || est.client?.legal_name || est.lead?.company_name || est.lead?.name || '').toLowerCase();
    const seller = (est.seller?.display_name || est.seller?.email || '').toLowerCase();
    const reviewer = (est.reviewer?.display_name || est.reviewer?.email || '').toLowerCase();
    const decisionNotes = (est.review_decision_notes || '').toLowerCase();
    const justification = (est.review_justification || '').toLowerCase();

    return (
      code.includes(term) ||
      clientName.includes(term) ||
      seller.includes(term) ||
      reviewer.includes(term) ||
      decisionNotes.includes(term) ||
      justification.includes(term)
    );
  });

  // KPIs dinâmicos conforme a aba ativa
  const pendentesCount = pendingEstimaciones.length;
  const pendentesRevenue = pendingEstimaciones.reduce((acc, est) => acc + Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0), 0);
  const pendentesDebito = pendingEstimaciones.reduce((acc, est) => acc + (est.financial?.totalVencido || 0), 0);

  const rejectedCount = rejectedEstimaciones.length;
  const rejectedRevenue = rejectedEstimaciones.reduce((acc, est) => acc + Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0), 0);

  const approvedCount = approvedEstimaciones.length;
  const approvedRevenue = approvedEstimaciones.reduce((acc, est) => acc + Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0), 0);
  const approvedMarginAvg = approvedCount > 0
    ? (approvedEstimaciones.reduce((acc, est) => acc + Number(est.estimated_margin_percent || est.current_version?.margin_percent || 0), 0) / approvedCount)
    : 0;

  const resolvedCount = resolvedEstimaciones.length;
  const resolvedRevenue = resolvedEstimaciones.reduce((acc, est) => acc + Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0), 0);
  const approvalRate = resolvedCount > 0 ? (approvedCount / resolvedCount) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Data não registrada';
    const date = parseISO(isoString);
    if (!isValid(date)) return 'Data inválida';
    return format(date, "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
  };

  const formatDateShort = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return isoString;
    }
  };

  const handleOpenDecision = (est: any, type: 'approve' | 'reject') => {
    setSelectedEstimacion(est);
    setDecisionType(type);
    setDecisionNotes('');
    setDecisionModalOpen(true);
  };

  const handleOpenReopen = (est: any) => {
    setSelectedEstimacion(est);
    setReopenNotes('');
    setReopenModalOpen(true);
  };

  const handleConfirmReopen = async () => {
    if (!selectedEstimacion) return;
    try {
      await reabrirAnaliseGerente.mutateAsync({
        id: selectedEstimacion.id,
        notes: reopenNotes.trim() || 'Reaberto para nova análise da gerência',
      });
      setReopenModalOpen(false);
      setSelectedEstimacion(null);
      refetch();
    } catch (err: any) {
      console.error('Erro ao reabrir orçamento:', err);
    }
  };

  const handleConfirmDecision = () => {
    if (!selectedEstimacion) return;
    if (decisionType === 'reject' && !decisionNotes.trim()) {
      toast.error('Informe o motivo ou a contraproposta ao rejeitar o orçamento.');
      return;
    }

    decidirAprovacaoGerente.mutate(
      {
        id: selectedEstimacion.id,
        aprovado: decisionType === 'approve',
        notes: decisionNotes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setDecisionModalOpen(false);
          setSelectedEstimacion(null);
          refetch();
        },
      }
    );
  };

  const isAdminOrManager = role === 'admin' || role === 'super_admin';

  if (!isAdminOrManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-4">
        <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Acesso Restrito à Gestão</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          A Mesa de Aprovações Comerciais é exclusiva para Diretores e Gerentes Comerciais analisarem exceções de margem, tarifas e crédito de clientes.
        </p>
        <Button onClick={() => navigate('/comercial/estimaciones')}>
          Ir para Meus Orçamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1700px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${
              statusTab === 'pending'
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : statusTab === 'rejected'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : statusTab === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
            }`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Mesa de Aprovações Comerciais
            </h1>
            <Badge variant="outline" className={`font-bold ${
              statusTab === 'pending'
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300'
                : statusTab === 'rejected'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300'
                  : statusTab === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300'
            }`}>
              {currentTabEstimaciones.length}{' '}
              {statusTab === 'pending'
                ? currentTabEstimaciones.length === 1 ? 'pendente' : 'pendentes'
                : statusTab === 'rejected'
                  ? currentTabEstimaciones.length === 1 ? 'rejeitado' : 'rejeitados'
                  : statusTab === 'approved'
                    ? currentTabEstimaciones.length === 1 ? 'aprovado' : 'aprovados'
                    : currentTabEstimaciones.length === 1 ? 'deliberação' : 'deliberações'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Controle de exceções comerciais: pendências urgentes, histórico de orçamentos rejeitados/suspensos e aprovações gerenciais.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={`h-8 px-3 text-xs font-semibold gap-1.5 transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-muted-foreground hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Lista Gerencial
            </Button>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className={`h-8 px-3 text-xs font-semibold gap-1.5 transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' 
                  : 'text-muted-foreground hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards Detalhados
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 h-9"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/comercial/estimaciones')}
            className="h-9"
          >
            Ver Todos os Orçamentos
          </Button>
        </div>
      </div>

      {/* Abas Principais: Pendentes vs Rejeitados vs Aprovados vs Todos Resolvidos */}
      <Tabs value={statusTab} onValueChange={(val: any) => setStatusTab(val)} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-4xl h-12 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shadow-inner">
          <TabsTrigger 
            value="pending"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 font-bold text-xs gap-2 rounded-lg transition-all"
          >
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Pendentes (Urgente)</span>
            <Badge className="bg-amber-500 hover:bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0 shadow-sm">
              {pendentesCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger 
            value="rejected"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400 font-bold text-xs gap-2 rounded-lg transition-all"
          >
            <XCircle className="h-4 w-4 text-red-500" />
            <span>Rejeitados / Suspensos</span>
            <Badge variant="outline" className={`font-black text-[10px] px-1.5 py-0 ${rejectedCount > 0 ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300' : 'text-slate-400'}`}>
              {rejectedCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger 
            value="approved"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 font-bold text-xs gap-2 rounded-lg transition-all"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Aprovados</span>
            <Badge variant="outline" className={`font-black text-[10px] px-1.5 py-0 ${approvedCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300' : 'text-slate-400'}`}>
              {approvedCount}
            </Badge>
          </TabsTrigger>

          <TabsTrigger 
            value="all_resolved"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 font-bold text-xs gap-2 rounded-lg transition-all"
          >
            <History className="h-4 w-4 text-slate-500" />
            <span>Todos Resolvidos</span>
            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 text-slate-500">
              {resolvedCount}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Alerta de Clientes com Dívida Regularizada no Contas a Receber */}
      {statusTab === 'rejected' && regularizedRejectedCount > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/70 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shadow-sm">
          <div className="flex items-center gap-2.5 font-medium">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 animate-bounce" />
            <span>
              <strong>{regularizedRejectedCount} orçamento(s)</strong> possuem clientes que regularizaram suas pendências financeiras no Contas a Receber! O histórico agora consta <strong>Em Dia (€ 0 pendente)</strong>. Você pode clicar em <strong>"Aprovar Agora"</strong> para liberar o orçamento.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards Dinâmicos Conforme a Aba Ativa */}
      {statusTab === 'pending' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>Orçamentos em Análise</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-900 dark:text-amber-200">
                {pendentesCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando decisão urgente da gerência
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Valor Total Sob Avaliação</span>
                <Coins className="h-4 w-4 text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(pendentesRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receita bruta das propostas pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Débito em Atraso dos Clientes</span>
                <CreditCard className="h-4 w-4 text-red-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-black ${pendentesDebito > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {formatCurrency(pendentesDebito)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendentesDebito > 0 ? 'Proponentes com títulos vencidos no Contas a Receber' : 'Nenhum débito vencido identificado'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Diretriz Comercial</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Piso de Margem: 15%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aprovações com registro de auditoria gerencial
              </p>
            </CardContent>
          </Card>
        </div>
      ) : statusTab === 'rejected' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-red-700 dark:text-red-400 flex items-center justify-between">
                <span>Orçamentos Rejeitados / Suspensos</span>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-red-900 dark:text-red-200">
                {rejectedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Propostas retidas por crédito ou margem
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Volume Bloqueado / Em Espera</span>
                <Coins className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(rejectedRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Volume financeiro sob suspensão temporária
              </p>
            </CardContent>
          </Card>

          <Card className={`border shadow-sm ${regularizedRejectedCount > 0 ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Clientes Regularizados</span>
                <Sparkles className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-black ${regularizedRejectedCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {regularizedRejectedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {regularizedRejectedCount > 0 ? 'Clientes quitaram débitos e podem ser aprovados' : 'Nenhum cliente regularizado ainda'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Ação de Recuperação</span>
                <RotateCcw className="h-4 w-4 text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Reviver ou Aprovar Agora
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reabra ou aprove propostas conforme liquidação financeira
              </p>
            </CardContent>
          </Card>
        </div>
      ) : statusTab === 'approved' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                <span>Orçamentos Aprovados</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-900 dark:text-emerald-200">
                {approvedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Exceções comerciais autorizadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Receita Liberada</span>
                <Coins className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(approvedRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Volume financeiro desbloqueado para proposta
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Margem Média das Exceções</span>
                <TrendingDown className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {approvedMarginAvg.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Margem média ponderada das concessões
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Auditoria & Governança</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Histórico Auditado
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Decisões gravadas com responsável e data
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-400 flex items-center justify-between">
                <span>Total Deliberado</span>
                <History className="h-4 w-4 text-indigo-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-indigo-900 dark:text-indigo-200">
                {resolvedCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {approvedCount} aprovados e {rejectedCount} rejeitados
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Volume Total Avaliado</span>
                <Coins className="h-4 w-4 text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {formatCurrency(resolvedRevenue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Volume financeiro total deliberado
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Taxa de Aprovação</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                {approvalRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Proporção de exceções autorizadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
                <span>Fila Urgente Atual</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                {pendentesCount}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Orçamentos aguardando na fila de análise
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Bar & Company Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 w-full shadow-sm">
          <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          <Input
            placeholder="Buscar por código, cliente, lead, vendedor ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-0 focus-visible:ring-0 shadow-none text-sm p-0 h-auto"
          />
          {searchTerm && (
            <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')} className="h-7 text-xs">
              Limpar
            </Button>
          )}
        </div>

        <div className="w-full sm:w-[240px]">
          <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl shadow-sm">
              <SelectValue placeholder="Todas as Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Empresas</SelectItem>
              {empresas.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.trade_name || emp.legal_name || emp.nome || 'Empresa'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List / Table of Pending Reviews */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">Carregando solicitações de aprovação e histórico financeiro...</p>
        </div>
      ) : filteredEstimaciones.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              statusTab === 'pending'
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600'
                : statusTab === 'rejected'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600'
            }`}>
              {statusTab === 'pending' ? <CheckCircle2 className="h-6 w-6" /> : <History className="h-6 w-6" />}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {searchTerm
                ? 'Nenhum orçamento encontrado para os termos da busca'
                : statusTab === 'pending'
                  ? 'Mesa de Aprovações Limpa!'
                  : statusTab === 'rejected'
                    ? 'Nenhum orçamento rejeitado ou suspenso'
                    : statusTab === 'approved'
                      ? 'Nenhum orçamento aprovado por exceção'
                      : 'Nenhum histórico de deliberação'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchTerm
                ? 'Tente ajustar os termos de busca para localizar o orçamento desejado.'
                : statusTab === 'pending'
                  ? 'Não há orçamentos pendentes de análise ou aprovação no momento. Todos os orçamentos estão em conformidade.'
                  : statusTab === 'rejected'
                    ? 'Não constam orçamentos rejeitados ou aguardando regularização financeira de clientes.'
                    : statusTab === 'approved'
                      ? 'Ainda não foram aprovadas exceções comerciais com parecer gerencial.'
                      : 'Nenhuma decisão de aprovação ou rejeição registrada até o momento.'}
            </p>
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        /* ================= TABELA / LISTA GERENCIAL COMPACTA ================= */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
              <TableRow>
                <TableHead className="w-[180px] font-bold">Orçamento / Data</TableHead>
                <TableHead className="font-bold">Cliente / Proponente</TableHead>
                <TableHead className="w-[270px] font-bold">Saúde Financeira / Cobrança</TableHead>
                <TableHead className="w-[160px] font-bold">Receita / Custo</TableHead>
                <TableHead className="w-[130px] font-bold">Margem</TableHead>
                <TableHead className="font-bold">
                  {statusTab === 'pending' ? 'Motivo do Bloqueio & Justificativa' : 'Deliberação & Motivo'}
                </TableHead>
                <TableHead className="w-[170px] text-right font-bold">Ações Gerenciais</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEstimaciones.map((est: any) => {
                const clientName = est.client?.trade_name || est.client?.legal_name || est.lead?.company_name || est.lead?.name || 'Cliente não identificado';
                const revenue = Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0);
                const cost = Number(est.total_estimated_cost || est.current_version?.total_cost || 0);
                const margin = Number(est.estimated_margin_percent || est.current_version?.margin_percent || 0);
                const reasons: string[] = Array.isArray(est.viability_reasons) ? est.viability_reasons : [];
                const fin = est.financial;

                const isPending = isItemPending(est);
                const isRejected = isItemRejected(est);
                const isApproved = isItemApproved(est);
                const isRegularized = isRejected && fin?.isUpToDate && fin?.totalInvoicesCount > 0;

                return (
                  <TableRow key={est.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Código, Data e Empresa */}
                    <TableCell className="align-top py-4">
                      <div className="space-y-1">
                        <div 
                          className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 hover:text-amber-600 cursor-pointer flex items-center gap-1.5"
                          onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                        >
                          {est.codigo}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateShort(est.review_requested_at || est.created_at)}
                        </div>
                        {est.empresa && (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-300">
                            {est.empresa.trade_name || est.empresa.legal_name}
                          </Badge>
                        )}
                        {/* Status visual se for resolvido */}
                        {isRejected && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold uppercase block w-fit">
                            Rejeitado
                          </Badge>
                        )}
                        {isApproved && (
                          <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-bold uppercase block w-fit">
                            Aprovado
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Cliente e Vendedor */}
                    <TableCell className="align-top py-4">
                      <div className="space-y-1">
                        <div 
                          className="font-bold text-sm text-slate-900 dark:text-slate-100 hover:underline cursor-pointer"
                          onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                        >
                          {clientName}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          Vendedor: {est.seller?.display_name || est.seller?.email || 'Comercial'}
                        </div>
                        {est.client?.codigo && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Cód: {est.client.codigo}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Saúde Financeira / Cobrança */}
                    <TableCell className="align-top py-4">
                      {fin ? (
                        <div className="space-y-1.5">
                          {isRegularized && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-0.5 gap-1 mb-1 shadow-sm">
                              <Sparkles className="h-3 w-3" />
                              Dívida Regularizada!
                            </Badge>
                          )}

                          {fin.hasDebt ? (
                            <Badge variant="destructive" className="font-bold text-[11px] px-2 py-0.5 gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Dívida: {formatCurrency(fin.totalVencido)} ({fin.faturasVencidas} vencida{fin.faturasVencidas > 1 ? 's' : ''})
                            </Badge>
                          ) : fin.totalSaldoAberto > 0 ? (
                            <Badge className="bg-amber-500 text-slate-950 font-bold text-[11px] px-2 py-0.5 gap-1">
                              <Clock className="h-3 w-3" />
                              A Vencer: {formatCurrency(fin.totalSaldoAberto)}
                            </Badge>
                          ) : fin.totalInvoicesCount > 0 ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2 py-0.5 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Em Dia (€ 0 pendente)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-500 text-[10px]">
                              Sem Histórico de Faturas
                            </Badge>
                          )}

                          {/* Última fatura emitida */}
                          {fin.ultimaFatura && (
                            <div className="text-[11px] text-muted-foreground leading-tight">
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Última Fat: </span>
                              <span className="font-mono">{fin.ultimaFatura.num_doc || 'S/N'}</span>
                              {fin.ultimaFatura.periodo_fat && (
                                <span className="text-slate-600 dark:text-slate-400 font-medium"> ({fin.ultimaFatura.periodo_fat})</span>
                              )}
                              <span className="block text-[10px]">
                                {formatCurrency(parseEuroNumber(fin.ultimaFatura.valot_total))} -{' '}
                                <span className={fin.ultimaFatura.status === 'Pago' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {fin.ultimaFatura.status || 'Pendente'}
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Botão Ver Extrato */}
                          {fin.totalInvoicesCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setFinancialModalData({ clientName, financial: fin })}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-1 hover:underline"
                            >
                              <Receipt className="h-3 w-3" />
                              Ver Extrato ({fin.totalInvoicesCount} faturas)
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          Lead sem histórico financeiro
                        </span>
                      )}
                    </TableCell>

                    {/* Receita / Custo */}
                    <TableCell className="align-top py-4">
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm font-mono text-slate-900 dark:text-slate-100">
                          {formatCurrency(revenue)}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground">
                          Custo: {formatCurrency(cost)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {est.current_version?.items?.length || 0} cargo(s)
                        </span>
                      </div>
                    </TableCell>

                    {/* Margem */}
                    <TableCell className="align-top py-4">
                      <div className="space-y-1">
                        <div className={`text-base font-black ${margin < 15 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {margin.toFixed(2)}%
                        </div>
                        {margin < 15 ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold uppercase">
                            Abaixo de 15%
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0 font-bold">
                            Conforme
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Motivo & Decisão / Justificativa */}
                    <TableCell className="align-top py-4 max-w-[280px]">
                      <div className="space-y-2">
                        {/* Se Pendente */}
                        {isPending && (
                          <>
                            {reasons.length > 0 ? (
                              <div className="text-[11px] text-red-700 dark:text-red-300 font-medium space-y-0.5">
                                {reasons.map((r, idx) => (
                                  <div key={idx} className="flex items-start gap-1">
                                    <span className="text-red-500 font-bold">•</span>
                                    <span className="line-clamp-2">{r}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                Margem reduzida fora da diretriz padrão.
                              </div>
                            )}

                            {est.review_justification && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700 line-clamp-2 cursor-help">
                                      "{est.review_justification}"
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs p-3">
                                    <p className="font-bold mb-1">Justificativa do Vendedor:</p>
                                    <p className="italic">"{est.review_justification}"</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </>
                        )}

                        {/* Se Rejeitado */}
                        {isRejected && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] text-red-700 dark:text-red-300 font-semibold">
                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                              Rejeitado em {formatDateShort(est.reviewed_at)}
                            </div>
                            <span className="text-[10px] text-muted-foreground block">
                              Por: {est.reviewer?.display_name || est.reviewer?.email || 'Gerência'}
                            </span>
                            <div className="text-[11px] text-slate-800 dark:text-slate-200 bg-red-50/60 dark:bg-red-950/20 p-1.5 rounded border border-red-200 dark:border-red-900/50">
                              <span className="font-semibold block text-[10px] text-red-800 dark:text-red-300">Parecer:</span>
                              "{est.review_decision_notes || 'Rejeitado pela gerência'}"
                            </div>
                          </div>
                        )}

                        {/* Se Aprovado */}
                        {isApproved && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Aprovado em {formatDateShort(est.reviewed_at)}
                            </div>
                            <span className="text-[10px] text-muted-foreground block">
                              Por: {est.reviewer?.display_name || est.reviewer?.email || 'Gerência'}
                            </span>
                            {est.review_decision_notes && (
                              <div className="text-[11px] text-slate-800 dark:text-slate-200 bg-emerald-50/60 dark:bg-emerald-950/20 p-1.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                                <span className="font-semibold block text-[10px] text-emerald-800 dark:text-emerald-300">Parecer:</span>
                                "{est.review_decision_notes}"
                              </div>
                            )}
                            <span className="text-[10px] text-muted-foreground block">
                              Status: <strong className="capitalize">{est.status === 'draft' ? 'Rascunho Liberado' : est.status}</strong>
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="align-top py-4 text-right">
                      <div className="flex flex-col gap-1.5 items-end">
                        {isPending && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenDecision(est, 'approve')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7 px-3 w-[125px] justify-center shadow-sm"
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDecision(est, 'reject')}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 text-xs font-semibold h-7 px-3 w-[125px] justify-center"
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Rejeitar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                              className="text-[11px] text-muted-foreground h-6 px-2 w-[125px] justify-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                          </>
                        )}

                        {isRejected && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenDecision(est, 'approve')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-7 px-2.5 w-[125px] justify-center shadow-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Aprovar Agora
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReopen(est)}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 text-xs font-semibold h-7 px-2.5 w-[125px] justify-center"
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1 text-amber-600" />
                              Reabrir Fila
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                              className="text-[11px] text-muted-foreground h-6 px-2 w-[125px] justify-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Detalhes
                            </Button>
                          </>
                        )}

                        {isApproved && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                              className="text-xs font-semibold h-7 px-2.5 w-[125px] justify-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5 text-indigo-500" />
                              Ver Orçamento
                            </Button>
                            {fin?.totalInvoicesCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFinancialModalData({ clientName, financial: fin })}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 h-6 px-2 w-[125px] justify-center"
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                Ver Extrato
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ================= CARDS DETALHADOS ================= */
        <div className="space-y-4">
          {filteredEstimaciones.map((est: any) => {
            const clientName = est.client?.trade_name || est.client?.legal_name || est.lead?.company_name || est.lead?.name || 'Cliente não identificado';
            const revenue = Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0);
            const cost = Number(est.total_estimated_cost || est.current_version?.total_cost || 0);
            const margin = Number(est.estimated_margin_percent || est.current_version?.margin_percent || 0);
            const reasons: string[] = Array.isArray(est.viability_reasons) ? est.viability_reasons : [];
            const fin = est.financial;

            const isPending = isItemPending(est);
            const isRejected = isItemRejected(est);
            const isApproved = isItemApproved(est);
            const isRegularized = isRejected && fin?.isUpToDate && fin?.totalInvoicesCount > 0;

            const cardBorderColor = isPending
              ? 'border-amber-300/70 dark:border-amber-900/60'
              : isRejected
                ? 'border-red-300/70 dark:border-red-900/60'
                : 'border-emerald-300/70 dark:border-emerald-900/60';

            const cardHeaderBg = isPending
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/40'
              : isRejected
                ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/30'
                : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/30';

            return (
              <Card
                key={est.id}
                className={`overflow-hidden border-2 ${cardBorderColor} shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className={`${cardHeaderBg} px-6 py-3 border-b flex flex-wrap items-center justify-between gap-2`}>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                      {est.codigo}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {isPending
                        ? `Solicitado em ${formatDate(est.review_requested_at || est.created_at)}`
                        : isRejected
                          ? `Rejeitado em ${formatDate(est.reviewed_at || est.updated_at)}`
                          : `Aprovado em ${formatDate(est.reviewed_at || est.updated_at)}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {est.empresa && (
                      <Badge variant="outline" className="text-[11px] bg-white dark:bg-slate-900 font-semibold">
                        <Building2 className="h-3 w-3 mr-1 text-amber-500" />
                        {est.empresa.trade_name || est.empresa.legal_name}
                      </Badge>
                    )}
                    {isPending && (
                      <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                        Sob Revisão Gerencial
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="destructive" className="font-bold text-[10px] uppercase tracking-wider">
                        Rejeitado / Suspenso
                      </Badge>
                    )}
                    {isApproved && (
                      <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider">
                        Aprovado por Exceção
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-6 space-y-5">
                  {/* Banner se o cliente regularizou a dívida */}
                  {isRegularized && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 shadow-sm">
                      <div className="flex items-center gap-2 font-semibold">
                        <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
                        <span>Cliente regularizou as pendências no Contas a Receber! Dívida quitada e histórico em dia.</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenDecision(est, 'approve')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 gap-1 shadow"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aprovar Agora
                      </Button>
                    </div>
                  )}

                  {/* Financial and proposal summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                        Cliente / Proponente
                      </span>
                      <p className="font-bold text-base text-slate-900 dark:text-slate-100 truncate">
                        {clientName}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3.5 w-3.5" />
                        Vendedor: {est.seller?.display_name || est.seller?.email || 'Comercial'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                        Faturamento & Custo Propostos
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-slate-100 font-mono">
                          {formatCurrency(revenue)}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          (Custo: {formatCurrency(cost)})
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {est.current_version?.items?.length || 0} cargo(s) orçado(s)
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                        Margem Global Calculada
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${margin < 15 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {margin.toFixed(2)}%
                        </span>
                        {margin < 15 && (
                          <Badge variant="destructive" className="text-[10px]">
                            Abaixo do Mínimo (15%)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* BLOCO: Situação Financeira do Cliente */}
                  {fin && (
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                          <CreditCard className="h-4 w-4 text-indigo-500" />
                          Situação Financeira & Histórico de Cobrança do Cliente:
                        </div>
                        {fin.totalInvoicesCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFinancialModalData({ clientName, financial: fin })}
                            className="h-6 text-xs text-indigo-600 hover:text-indigo-800 gap-1 font-semibold p-1"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            Extrato Completo ({fin.totalInvoicesCount} faturas)
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-muted-foreground block text-[11px]">Débito Vencido (Atraso)</span>
                          <span className={`font-bold text-sm ${fin.totalVencido > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {formatCurrency(fin.totalVencido)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {fin.faturasVencidas} fatura{fin.faturasVencidas === 1 ? '' : 's'} vencida{fin.faturasVencidas === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-muted-foreground block text-[11px]">Saldo Total em Aberto</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {formatCurrency(fin.totalSaldoAberto)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Total a liquidar
                          </span>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-muted-foreground block text-[11px]">Última Fatura Emitida</span>
                          {fin.ultimaFatura ? (
                            <div>
                              <span className="font-bold font-mono text-xs block text-slate-900 dark:text-slate-100 truncate">
                                {fin.ultimaFatura.num_doc || 'Sem nº'}
                                {fin.ultimaFatura.periodo_fat ? ` (${fin.ultimaFatura.periodo_fat})` : ''} ({formatCurrency(parseEuroNumber(fin.ultimaFatura.valot_total))})
                              </span>
                              <Badge className={`text-[9px] px-1 py-0 font-semibold ${fin.ultimaFatura.status === 'Pago' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                                {fin.ultimaFatura.status || 'Pendente'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Sem emissões</span>
                          )}
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-muted-foreground block text-[11px]">Total Faturado Histórico</span>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {formatCurrency(fin.totalFaturado)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {fin.totalInvoicesCount} faturas registradas
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Parecer do Gerente se Rejeitado ou Aprovado */}
                  {isRejected && (
                    <div className="bg-red-50/60 dark:bg-red-950/20 p-4 rounded-xl border border-red-200 dark:border-red-900/50 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-900 dark:text-red-300">
                        <XCircle className="h-4 w-4 text-red-600" />
                        Motivo da Rejeição Gerencial (por {est.reviewer?.display_name || est.reviewer?.email || 'Gerência'} em {formatDate(est.reviewed_at)}):
                      </div>
                      <p className="text-xs text-red-950 dark:text-red-200 font-medium italic pl-6 border-l-2 border-red-500">
                        "{est.review_decision_notes || 'Rejeitado pela gerência'}"
                      </p>
                    </div>
                  )}

                  {isApproved && (
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Parecer da Aprovação por Exceção (por {est.reviewer?.display_name || est.reviewer?.email || 'Gerência'} em {formatDate(est.reviewed_at)}):
                      </div>
                      <p className="text-xs text-emerald-950 dark:text-emerald-200 font-medium italic pl-6 border-l-2 border-emerald-500">
                        "{est.review_decision_notes || 'Aprovado por exceção comercial'}"
                      </p>
                    </div>
                  )}

                  {/* Violations / Reasons Box */}
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 p-4 rounded-xl border border-amber-200/80 dark:border-amber-900/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Parâmetros Fora da Diretriz Comercial:
                    </div>
                    {reasons.length > 0 ? (
                      <ul className="list-disc pl-5 text-xs text-amber-950 dark:text-amber-400 space-y-1">
                        {reasons.map((r, idx) => (
                          <li key={idx} className="leading-relaxed">{r}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-amber-900 dark:text-amber-400">
                        Orçamento submetido para avaliação com parâmetros abaixo dos limites de viabilidade permitidos.
                      </p>
                    )}
                  </div>

                  {/* Salesperson Justification */}
                  {est.review_justification && (
                    <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <MessageSquare className="h-4 w-4 text-amber-500" />
                        Justificativa Comercial do Vendedor:
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 italic whitespace-pre-wrap pl-6 border-l-2 border-amber-500">
                        "{est.review_justification}"
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                      className="gap-1.5 text-xs"
                    >
                      <Eye className="h-4 w-4" />
                      Abrir Orçamento Completo
                      <ExternalLink className="h-3 w-3 ml-0.5 text-muted-foreground" />
                    </Button>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDecision(est, 'reject')}
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30 text-xs font-semibold"
                          >
                            <XCircle className="h-4 w-4 mr-1.5" />
                            Rejeitar / Solicitar Revisão
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleOpenDecision(est, 'approve')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Aprovar Exceção
                          </Button>
                        </>
                      )}

                      {isRejected && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReopen(est)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 text-xs font-semibold"
                          >
                            <RotateCcw className="h-4 w-4 mr-1.5 text-amber-600" />
                            Reabrir para Análise
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleOpenDecision(est, 'approve')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Aprovar Agora
                          </Button>
                        </>
                      )}

                      {isApproved && (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs px-3 py-1 gap-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Liberado para Envio de Proposta
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Extrato Financeiro Completo do Cliente */}
      <Dialog open={!!financialModalData} onOpenChange={(open) => !open && setFinancialModalData(null)}>
        <DialogContent className="max-w-5xl xl:max-w-6xl w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Extrato de Cobrança & Faturamento — {financialModalData?.clientName}
            </DialogTitle>
            <DialogDescription>
              Histórico das últimas faturas emitidas, mês de faturamento de origem, vencimentos e liquidações registradas no Contas a Receber.
            </DialogDescription>
          </DialogHeader>

          {financialModalData && (
            <div className="space-y-4 pt-2">
              {/* Resumo rápido no topo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Total Faturado</span>
                  <span className="text-base font-bold font-mono">
                    {formatCurrency(financialModalData.financial.totalFaturado)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Saldo em Aberto</span>
                  <span className="text-base font-bold font-mono">
                    {formatCurrency(financialModalData.financial.totalSaldoAberto)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Débito Vencido</span>
                  <span className={`text-base font-bold font-mono ${financialModalData.financial.totalVencido > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(financialModalData.financial.totalVencido)}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground block">Status do Cliente</span>
                  <Badge className={`text-xs mt-1 ${financialModalData.financial.hasDebt ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {financialModalData.financial.statusLabel}
                  </Badge>
                </div>
              </div>

              {/* Tabela de faturas */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-100 dark:bg-slate-800">
                    <TableRow>
                      <TableHead className="font-bold text-xs">Documento</TableHead>
                      <TableHead className="font-bold text-xs">Mês Fat.</TableHead>
                      <TableHead className="font-bold text-xs">Emissão</TableHead>
                      <TableHead className="font-bold text-xs">Vencimento</TableHead>
                      <TableHead className="font-bold text-xs">Recebimento</TableHead>
                      <TableHead className="font-bold text-xs text-right">Valor Total</TableHead>
                      <TableHead className="font-bold text-xs text-right">Saldo Aberto</TableHead>
                      <TableHead className="font-bold text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financialModalData.financial.invoices.map((inv: any) => {
                      const total = parseEuroNumber(inv.valot_total);
                      const saldo = parseEuroNumber(inv.saldo_a_pagar);
                      const isPago = inv.status === 'Pago' || saldo <= 0;

                      // Status dinâmico inteligente e cálculo de dias em atraso
                      let statusBadge = null;
                      let daysOverdue = 0;

                      if (isPago) {
                        statusBadge = (
                          <Badge className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                            Pago
                          </Badge>
                        );
                      } else if (inv.dt_venc) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const vDate = new Date(inv.dt_venc);
                        vDate.setHours(0, 0, 0, 0);
                        daysOverdue = Math.floor((today.getTime() - vDate.getTime()) / (1000 * 60 * 60 * 24));

                        if (daysOverdue > 0) {
                          statusBadge = (
                            <Badge className="text-[10px] font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm">
                              Vencido ({daysOverdue}d)
                            </Badge>
                          );
                        } else if (daysOverdue === 0) {
                          statusBadge = (
                            <Badge className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                              Vence Hoje
                            </Badge>
                          );
                        } else {
                          statusBadge = (
                            <Badge variant="outline" className="text-[10px] font-bold text-amber-700 border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
                              A Vencer
                            </Badge>
                          );
                        }
                      } else {
                        statusBadge = (
                          <Badge variant="outline" className="text-[10px] font-bold text-slate-600">
                            {inv.status || 'Pendente'}
                          </Badge>
                        );
                      }

                      return (
                        <TableRow key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <TableCell className="font-mono font-bold text-xs">
                            {inv.num_doc || `DOC-${inv.id}`}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {inv.periodo_fat ? (
                              <Badge variant="outline" className="font-medium text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700">
                                {inv.periodo_fat}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateShort(inv.data_emissao)}
                          </TableCell>
                          <TableCell className={`text-xs font-mono ${daysOverdue > 0 ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                            {formatDateShort(inv.dt_venc)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {formatDateShort(inv.dt_recebimento)}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-xs text-right">
                            {formatCurrency(total)}
                          </TableCell>
                          <TableCell className={`font-mono font-semibold text-xs text-right ${saldo > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}`}>
                            {formatCurrency(saldo)}
                          </TableCell>
                          <TableCell className="text-center">
                            {statusBadge}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinancialModalData(null)}>
              Fechar Extrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Decisão do Gerente */}
      <Dialog open={decisionModalOpen} onOpenChange={setDecisionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionType === 'approve' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  {selectedEstimacion?.status === 'rejected'
                    ? 'Aprovar Orçamento Anteriormente Rejeitado'
                    : 'Aprovar Exceção Comercial'}
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejeitar Orçamento / Suspender
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {decisionType === 'approve'
                ? selectedEstimacion?.status === 'rejected'
                  ? `Você está revertendo a rejeição e aprovando as condições do orçamento ${selectedEstimacion?.codigo}. O vendedor poderá gerar e enviar a proposta ao cliente.`
                  : `Você está aprovando as condições comerciais fora de padrão para o orçamento ${selectedEstimacion?.codigo}. O vendedor poderá gerar e enviar a proposta ao cliente.`
                : `Você está rejeitando o orçamento ${selectedEstimacion?.codigo}. Ele será movido para a aba de Rejeitados / Suspensos e o vendedor será notificado.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {decisionType === 'approve'
                  ? selectedEstimacion?.status === 'rejected'
                    ? 'Motivo da Liberação / Parecer (Opcional):'
                    : 'Observações da Aprovação (Opcional):'
                  : 'Motivo da Rejeição / Contraproposta (Obrigatório):'}
              </label>
              <Textarea
                placeholder={
                  decisionType === 'approve'
                    ? selectedEstimacion?.status === 'rejected'
                      ? 'Ex: Cliente quitou faturas pendentes / Condições acordadas com a diretoria...'
                      : 'Ex: Aprovado conforme acordo de volume ou fidelidade do cliente...'
                    : 'Ex: Cliente possui débitos vencidos / Ajustar tarifa do soldador para mínimo de € 28,00/h...'
                }
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="text-xs resize-none"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDecisionModalOpen(false)}
              disabled={decidirAprovacaoGerente.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDecision}
              disabled={decidirAprovacaoGerente.isPending}
              className={
                decisionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  : 'bg-red-600 hover:bg-red-700 text-white font-bold'
              }
            >
              {decidirAprovacaoGerente.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Processando...
                </>
              ) : decisionType === 'approve' ? (
                'Confirmar Aprovação'
              ) : (
                'Confirmar Rejeição'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Reabrir Orçamento para Análise */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reabrir Orçamento para Análise
            </DialogTitle>
            <DialogDescription>
              O orçamento {selectedEstimacion?.codigo} retornará para a fila de Pendentes (Urgente) para nova deliberação gerencial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Observações da Reabertura (Opcional):
              </label>
              <Textarea
                placeholder="Ex: Cliente regularizou as pendências no financeiro / Condições revistas..."
                value={reopenNotes}
                onChange={(e) => setReopenNotes(e.target.value)}
                className="text-xs resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setReopenModalOpen(false)}
              disabled={reabrirAnaliseGerente.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReopen}
              disabled={reabrirAnaliseGerente.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {reabrirAnaliseGerente.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Reabertura'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
