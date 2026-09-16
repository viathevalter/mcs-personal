import React, { useState } from 'react';
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
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function MesaAprovacoesPage() {
  const navigate = useNavigate();
  const { selectedEmpresaId, role, empresas = [] } = useEmpresa();
  const { decidirAprovacaoGerente } = useEstimacionMutations();

  const [searchTerm, setSearchTerm] = useState('');
  const [empresaFilter, setEmpresaFilter] = useState<string>(selectedEmpresaId || 'all');
  const [selectedEstimacion, setSelectedEstimacion] = useState<any | null>(null);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject'>('approve');
  const [decisionNotes, setDecisionNotes] = useState('');

  React.useEffect(() => {
    if (selectedEmpresaId && selectedEmpresaId !== 'all') {
      setEmpresaFilter(selectedEmpresaId);
    }
  }, [selectedEmpresaId]);

  // Consulta de orçamentos em status 'review'
  const { data: pendingEstimaciones = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['aprovacoes-pendentes', empresaFilter, selectedEmpresaId],
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
        .eq('status', 'review')
        .order('review_requested_at', { ascending: false, nullsFirst: false });

      if (empresaFilter && empresaFilter !== 'all') {
        query = query.eq('empresa_id', empresaFilter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro na query de aprovações pendentes:', error);
        throw error;
      }
      if (!data || data.length === 0) return [];

      const clientIds = [...new Set(data.map(d => d.client_id).filter(Boolean))];
      const leadIds = [...new Set(data.map(d => d.lead_id).filter(Boolean))];
      const userIds = [...new Set(data.map(d => d.created_by).filter(Boolean))];

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

      return data.map(est => ({
        ...est,
        client: clients?.find((c: any) => c.id === est.client_id),
        lead: leads?.find((l: any) => l.id === est.lead_id),
        seller: users?.find((u: any) => u.id === est.created_by),
        empresa: empresas.find(e => e.id === est.empresa_id),
      }));
    },
    enabled: !!selectedEmpresaId,
  });

  // Filtragem local
  const filteredEstimaciones = pendingEstimaciones.filter((est: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const code = (est.codigo || '').toLowerCase();
    const clientName = (est.client?.trade_name || est.client?.legal_name || est.lead?.company_name || est.lead?.name || '').toLowerCase();
    const seller = (est.seller?.display_name || est.seller?.email || '').toLowerCase();
    return code.includes(term) || clientName.includes(term) || seller.includes(term);
  });

  // KPIs
  const totalPendentes = pendingEstimaciones.length;
  const valorTotalSobAnalise = pendingEstimaciones.reduce((acc, est) => {
    const val = Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0);
    return acc + val;
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Data não registrada';
    const date = parseISO(isoString);
    if (!isValid(date)) return 'Data inválida';
    return format(date, "dd 'de' MMM 'às' HH:mm", { locale: ptBR });
  };

  const handleOpenDecision = (est: any, type: 'approve' | 'reject') => {
    setSelectedEstimacion(est);
    setDecisionType(type);
    setDecisionNotes('');
    setDecisionModalOpen(true);
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Mesa de Aprovações Comerciais
            </h1>
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
              {totalPendentes} {totalPendentes === 1 ? 'pendente' : 'pendentes'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Avaliação de orçamentos com margem abaixo do parâmetro, tarifas operacionais abaixo do piso ou clientes com restrições financeiras.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/comercial/estimaciones')}
          >
            Ver Todos os Orçamentos
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center justify-between">
              <span>Orçamentos em Análise</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-900 dark:text-amber-200">
              {totalPendentes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando decisão da gerência
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
              <span>Valor Total Sob Avaliação</span>
              <Coins className="h-4 w-4 text-indigo-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(valorTotalSobAnalise)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita bruta estimada
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase text-slate-500 flex items-center justify-between">
              <span>Diretriz Comercial</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Controle de Margem & Piso de Tarifas
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Decisões registradas com auditoria para a diretoria
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar & Company Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 w-full">
          <Search className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          <Input
            placeholder="Buscar por código, cliente, lead ou vendedor..."
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
            <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 rounded-xl">
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

      {/* List of Pending Reviews */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-sm text-muted-foreground">Carregando solicitações de aprovação...</p>
        </div>
      ) : filteredEstimaciones.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {searchTerm ? 'Nenhum orçamento encontrado para o filtro' : 'Mesa de Aprovações Limpa!'}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchTerm
                ? 'Tente ajustar os termos de busca para localizar o orçamento desejado.'
                : 'Não há orçamentos pendentes de análise ou aprovação no momento. Todos os orçamentos estão em conformidade.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEstimaciones.map((est: any) => {
            const clientName = est.client?.trade_name || est.client?.legal_name || est.lead?.company_name || est.lead?.name || 'Cliente não identificado';
            const revenue = Number(est.total_estimated_revenue || est.current_version?.total_revenue || 0);
            const cost = Number(est.total_estimated_cost || est.current_version?.total_cost || 0);
            const margin = Number(est.estimated_margin_percent || est.current_version?.margin_percent || 0);
            const reasons: string[] = Array.isArray(est.viability_reasons) ? est.viability_reasons : [];

            return (
              <Card
                key={est.id}
                className="overflow-hidden border-2 border-amber-300/70 dark:border-amber-900/60 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="bg-amber-50/70 dark:bg-amber-950/30 px-6 py-3 border-b border-amber-200/70 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                      {est.codigo}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Solicitado em {formatDate(est.review_requested_at || est.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {est.empresa && (
                      <Badge variant="outline" className="text-[11px] bg-white dark:bg-slate-900">
                        <Building2 className="h-3 w-3 mr-1 text-amber-500" />
                        {est.empresa.trade_name || est.empresa.legal_name}
                      </Badge>
                    )}
                    <Badge className="bg-amber-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                      Sob Revisão Gerencial
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6 space-y-5">
                  {/* Client and Financial summary row */}
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
                        Faturamento & Custo
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

                  {/* Violations / Reasons Box */}
                  <div className="bg-red-50/60 dark:bg-red-950/20 p-4 rounded-xl border border-red-200 dark:border-red-900/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Violações de Governança Identificadas:
                    </div>
                    {reasons.length > 0 ? (
                      <ul className="list-disc pl-5 text-xs text-red-800 dark:text-red-400 space-y-1">
                        {reasons.map((r, idx) => (
                          <li key={idx} className="leading-relaxed">{r}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-red-700 dark:text-red-400">
                        Orçamento submetido para avaliação com parâmetros abaixo dos limites de viabilidade permitidos.
                      </p>
                    )}
                  </div>

                  {/* Salesperson Justification */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      <MessageSquare className="h-4 w-4 text-amber-500" />
                      Justificativa Comercial do Vendedor:
                    </div>
                    {est.review_justification ? (
                      <p className="text-xs text-slate-800 dark:text-slate-200 italic whitespace-pre-wrap pl-6 border-l-2 border-amber-500">
                        "{est.review_justification}"
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic pl-6">
                        Nenhuma justificativa formal detalhada informada pelo vendedor.
                      </p>
                    )}
                  </div>

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
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Decisão do Gerente */}
      <Dialog open={decisionModalOpen} onOpenChange={setDecisionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {decisionType === 'approve' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Aprovar Exceção Comercial
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejeitar Orçamento / Solicitar Revisão
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {decisionType === 'approve' ? (
                <>
                  Ao aprovar, o orçamento {selectedEstimacion?.codigo} retornará ao status de rascunho com a flag de aprovação gerencial validada, liberando a geração e envio de propostas ao cliente.
                </>
              ) : (
                <>
                  Ao rejeitar, o orçamento {selectedEstimacion?.codigo} será marcado como rejeitado e o vendedor receberá suas instruções para refazer a proposta.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {decisionType === 'approve'
                ? 'Observações da Aprovação (Opcional - registrado no histórico)'
                : 'Instruções de Revisão / Contraproposta *'}
            </label>
            <Textarea
              placeholder={
                decisionType === 'approve'
                  ? 'Ex: Aprovado em caráter excepcional devido à previsão de fechamento de contrato anual...'
                  : 'Ex: Aumentar tarifa para 28,00€ ou exigir pagamento de sinal de 30% em virtude das faturas em atraso...'
              }
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className={
                decisionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  : 'bg-red-600 hover:bg-red-700 text-white font-bold'
              }
              onClick={handleConfirmDecision}
              disabled={decidirAprovacaoGerente.isPending}
            >
              {decidirAprovacaoGerente.isPending ? 'Processando...' : decisionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
