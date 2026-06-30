import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEstimaciones } from '@/features/comercial/estimaciones/hooks/useEstimaciones';
import { usePedidos } from '@/features/operacoes/pedidos/hooks/usePedidos';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  Calendar, 
  FileCheck, 
  ArrowRight,
  Briefcase,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import type { Client } from '../../types';

interface ClientHistoryTabProps {
  client: Client;
}

export function ClientHistoryTab({ client }: ClientHistoryTabProps) {
  const clientId = client.id!;

  const handleOpenDocument = async (path: string) => {
    if (!path) {
      toast.error("Caminho do documento inválido.");
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('proposal-signatures')
        .createSignedUrl(path, 3600);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        toast.error("Não foi possível gerar o link do documento.");
      }
    } catch (err: any) {
      console.error("Erro ao gerar link de download:", err);
      toast.error("Erro ao abrir documento no storage.");
    }
  };

  // 1. Fetch proposals (estimaciones) for this client globally
  const { data: estimaciones = [], isLoading: isLoadingEst } = useEstimaciones({
    client_id: clientId,
    empresa_id: 'all'
  });

  // 2. Fetch operational orders (pedidos) for this client
  const { data: pedidosData, isLoading: isLoadingPedidos } = usePedidos({
    client_id: clientId
  });
  const pedidos = pedidosData?.pedidos || [];

  // 3. Fetch proposal signatures to know if they signed contracts/proposals
  const { data: signatures = [], isLoading: isLoadingSigs } = useQuery({
    queryKey: ['client_proposal_signatures', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('proposal_signatures')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  const isLoading = isLoadingEst || isLoadingPedidos || isLoadingSigs;

  // Format Date Helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '--';
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Format Currency Helper
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '--';
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Find signature for a given estimation
  const getSignatureInfo = (estimacionId: string) => {
    return signatures.find(s => s.estimacion_id === estimacionId);
  };

  // Calculate totals
  const totalProposalsCount = estimaciones.length;
  const signedProposalsCount = estimaciones.filter(e => e.status === 'approved').length;
  const activeOrdersCount = pedidos.filter(p => p.commercial_status === 'active').length;
  
  // Earliest date (journey start)
  const journeyStartDate = client.created_at ? formatDate(client.created_at) : '--';

  // Get status badge for Proposal Signature
  const getSignatureBadge = (status?: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Assinado</Badge>;
      case 'pending_signature':
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20">Pendente Assinatura</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">Expirado</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  // Get status badge for Pedido (Operational Order)
  const getPedidoStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Ativo</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Finalizado</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Cancelado</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Suspenso</Badge>;
      default:
        return <Badge variant="secondary">Rascunho</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted/20 animate-pulse rounded-xl border" />
          ))}
        </div>
        <div className="h-64 bg-muted/20 animate-pulse rounded-xl border" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jornada Comercial</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Cadastrado</div>
            <p className="text-xs text-muted-foreground mt-1">Desde {journeyStartDate}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Propostas & Pressupostos</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProposalsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {signedProposalsCount} aprovadas/assinadas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos & Contratos Ativos</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrdersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              De um total de {pedidos.length} pedidos históricos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Client Journey Timeline */}
      <div className="bg-card border p-6 rounded-xl shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">Histórico de Jornada do Cliente</h3>
          <p className="text-sm text-muted-foreground">Histórico cronológico de propostas, contratações e assinaturas.</p>
        </div>

        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8 pb-4">
          {/* Journey Start */}
          <div className="relative pl-6">
            <div className="absolute -left-[9px] top-1.5 bg-orange-500 h-4 w-4 rounded-full border-4 border-background" />
            <span className="text-xs font-semibold text-orange-500">{journeyStartDate}</span>
            <h4 className="font-semibold text-foreground mt-1">Cadastro Inicial</h4>
            <p className="text-sm text-muted-foreground">O cadastro do cliente foi criado e parametrizado no painel Master Data.</p>
          </div>

          {/* Proposals & Signatures Journey */}
          {estimaciones.slice().reverse().map((est) => {
            const sig = getSignatureInfo(est.id);
            return (
              <div key={est.id} className="relative pl-6">
                <div className="absolute -left-[7px] top-1.5 bg-slate-300 dark:bg-slate-700 h-3 w-3 rounded-full border-2 border-background" />
                <span className="text-xs font-medium text-muted-foreground">{formatDate(est.created_at)}</span>
                <h4 className="font-semibold text-foreground mt-1 flex items-center gap-2">
                  Proposta Criada: {est.codigo}
                  <Badge variant="outline">{est.estimation_type === 'expansion' ? 'Ampliação' : 'Nova Alocação'}</Badge>
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Valor estimado: <strong className="text-foreground">{formatCurrency(est.current_version?.total_revenue)}</strong> • Margem: {est.current_version?.margin_percent}%
                </p>

                {sig && (
                  <div className="mt-2 bg-muted/30 border rounded-lg p-3 max-w-lg space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Status da Assinatura:
                      </span>
                      {getSignatureBadge(sig.status)}
                    </div>
                    {sig.signed_at && (
                      <p className="text-xs text-muted-foreground">
                        Assinado digitalmente em: <strong className="text-foreground">{formatDate(sig.signed_at)}</strong>
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {sig.signed_document_url && (
                        <button 
                          onClick={() => handleOpenDocument(sig.signed_document_url!)}
                          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-medium bg-orange-500/5 px-2 py-1 rounded cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver Proposta Assinada
                        </button>
                      )}
                      {sig.contract_signed_document_url && (
                        <button 
                          onClick={() => handleOpenDocument(sig.contract_signed_document_url!)}
                          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 font-medium bg-orange-500/5 px-2 py-1 rounded cursor-pointer"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver Contrato Assinado
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Active Orders Journey */}
          {pedidos.slice().reverse().map((pedido) => (
            <div key={pedido.id} className="relative pl-6">
              <div className="absolute -left-[7px] top-1.5 bg-emerald-500 h-3 w-3 rounded-full border-2 border-background" />
              <span className="text-xs font-medium text-muted-foreground">{formatDate(pedido.created_at)}</span>
              <h4 className="font-semibold text-foreground mt-1 flex items-center gap-2">
                Pedido de Operação Ativado: {pedido.codigo}
                {getPedidoStatusBadge(pedido.commercial_status)}
              </h4>
              <p className="text-sm text-muted-foreground">
                Início: {formatDate(pedido.expected_start_date)} • Fim: {formatDate(pedido.expected_end_date)}
              </p>
              {pedido.total_revenue_snapshot && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Faturamento mensal snapshot: <strong className="text-foreground">{formatCurrency(pedido.total_revenue_snapshot)}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Proposals Table Section */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/10">
          <h3 className="text-lg font-semibold">Tabela de Propostas & Pressupostos</h3>
          <p className="text-sm text-muted-foreground">Lista de todas as propostas enviadas e seu status comercial.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-5 py-3 font-medium text-slate-500">Código</th>
                <th className="px-5 py-3 font-medium text-slate-500">Data</th>
                <th className="px-5 py-3 font-medium text-slate-500">Tipo</th>
                <th className="px-5 py-3 font-medium text-slate-500">Faturamento Previsto</th>
                <th className="px-5 py-3 font-medium text-slate-500">Status Geral</th>
                <th className="px-5 py-3 font-medium text-slate-500">Documentos Assinados</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {estimaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    Nenhuma proposta comercial encontrada para este cliente.
                  </td>
                </tr>
              ) : (
                estimaciones.map((est) => {
                  const sig = getSignatureInfo(est.id);
                  return (
                    <tr key={est.id} className="hover:bg-slate-50/40">
                      <td className="px-5 py-4 font-semibold text-foreground">{est.codigo}</td>
                      <td className="px-5 py-4 text-muted-foreground">{formatDate(est.created_at)}</td>
                      <td className="px-5 py-4">
                        <Badge variant="outline">
                          {est.estimation_type === 'expansion' ? 'Ampliação' : 'Alocação Nova'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground">
                        {formatCurrency(est.current_version?.total_revenue)}
                      </td>
                      <td className="px-5 py-4">
                        {est.status === 'approved' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Aprovado</Badge>
                        ) : est.status === 'draft' ? (
                          <Badge variant="secondary">Rascunho</Badge>
                        ) : (
                          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 space-y-1">
                        {sig?.signed_document_url ? (
                          <button 
                            onClick={() => handleOpenDocument(sig.signed_document_url!)}
                            className="text-xs text-orange-500 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-left font-medium"
                          >
                            <FileCheck className="h-3.5 w-3.5" /> Proposta Assinada
                          </button>
                        ) : null}
                        {sig?.contract_signed_document_url ? (
                          <button 
                            onClick={() => handleOpenDocument(sig.contract_signed_document_url!)}
                            className="text-xs text-orange-500 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 text-left mt-1 block font-medium"
                          >
                            <FileCheck className="h-3.5 w-3.5" /> Contrato Assinado
                          </button>
                        ) : null}
                        {!sig?.signed_document_url && !sig?.contract_signed_document_url && (
                          <span className="text-muted-foreground/60 italic text-xs">Sem documentos assinados</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pedidos Table Section */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/10">
          <h3 className="text-lg font-semibold">Pedidos de Operação & Contratos Ativos</h3>
          <p className="text-sm text-muted-foreground">Histórico de contratos operacionais ativos, obras associadas e datas de vigência.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-5 py-3 font-medium text-slate-500">Código</th>
                <th className="px-5 py-3 font-medium text-slate-500">Obra / Local</th>
                <th className="px-5 py-3 font-medium text-slate-500">Tipo de Pedido</th>
                <th className="px-5 py-3 font-medium text-slate-500">Período de Vigência</th>
                <th className="px-5 py-3 font-medium text-slate-500">Faturamento Snapshot</th>
                <th className="px-5 py-3 font-medium text-slate-500">Status Comercial</th>
                <th className="px-5 py-3 font-medium text-slate-500">Status Operacional</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    Nenhum pedido de operação ou contrato ativo encontrado para este cliente.
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-slate-50/40">
                    <td className="px-5 py-4 font-semibold text-foreground">{pedido.codigo}</td>
                    <td className="px-5 py-4 text-foreground">{pedido.client_site?.name || 'Geral'}</td>
                    <td className="px-5 py-4">
                      {pedido.order_type === 'expansion' ? 'Ampliação' : pedido.order_type === 'direct' ? 'Direto' : 'Nova Alocação'}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(pedido.expected_start_date)} <ArrowRight className="inline h-3 w-3 mx-1" /> {formatDate(pedido.expected_end_date)}
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground">
                      {formatCurrency(pedido.total_revenue_snapshot)}
                    </td>
                    <td className="px-5 py-4">
                      {getPedidoStatusBadge(pedido.commercial_status)}
                    </td>
                    <td className="px-5 py-4">
                      {pedido.operational_status === 'fulfilled' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Preenchido</Badge>
                      ) : pedido.operational_status === 'partially_fulfilled' ? (
                        <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Parcial</Badge>
                      ) : (
                        <Badge variant="outline">Pendente Op.</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
