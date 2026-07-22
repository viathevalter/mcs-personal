import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Clock, CheckCircle2, XCircle, Loader2, Copy, Eye, Mail, Send, FileText, AlertTriangle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getFaturasTracking, processarContestacaoFatura, gerarCobroDaFatura, cancelarFatura } from '../api/faturamentoApi';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEmpresa } from '../../../app/providers/EmpresaProvider';
import { supabase } from '@/shared/supabase/client';

// Helper to calculate expected due date and remaining/overdue days
const getDueDateAndRemaining = (emissaoStr: string | null, days: number | null) => {
  if (!emissaoStr) return { dueDateStr: '--/--/----', daysText: '', isOverdue: false, daysVal: 0 };
  
  const emissionDate = new Date(emissaoStr);
  
  // If days is null, we can't calculate due date
  if (days === null) {
    return { dueDateStr: 'Não Definido', daysText: '', isOverdue: false, daysVal: 0 };
  }

  const dueDate = new Date(emissionDate.getTime());
  dueDate.setDate(dueDate.getDate() + days);
  
  const today = new Date();
  // Normalize dates to midnight to calculate difference in full days
  const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const d2 = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const dueDateStr = dueDate.toLocaleDateString('pt-PT');
  
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return { 
      dueDateStr, 
      daysText: `Vencida há ${overdueDays} ${overdueDays === 1 ? 'dia' : 'dias'}`, 
      isOverdue: true,
      daysVal: diffDays
    };
  } else if (diffDays === 0) {
    return { 
      dueDateStr, 
      daysText: 'Vence hoje', 
      isOverdue: false,
      daysVal: 0
    };
  } else {
    return { 
      dueDateStr, 
      daysText: `${diffDays} ${diffDays === 1 ? 'dia restante' : 'dias restantes'}`, 
      isOverdue: false,
      daysVal: diffDays
    };
  }
};

const getWeekDayLabel = (day: number, year: number, month: number) => {
  const date = new Date(year, month, day);
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
};

const isWeekend = (day: number, year: number, month: number) => {
  const date = new Date(year, month, day);
  const wDay = date.getDay();
  return wDay === 0 || wDay === 6;
};

export function FaturasTracking() {
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [disputeHours, setDisputeHours] = useState<any[]>([]);
  const [loadingDisputeHours, setLoadingDisputeHours] = useState(false);
  const [resolvingDispute, setResolvingDispute] = useState(false);
  const [adminModifiedHours, setAdminModifiedHours] = useState<Record<string, Record<string, number>>>({});
  const [adminEditingCell, setAdminEditingCell] = useState<{ workerId: string; dateKey: string } | null>(null);
  const [disputeActiveTab, setDisputeActiveTab] = useState<'resumo' | 'informe' | 'factura'>('resumo');
  const [isGeneratingCobro, setIsGeneratingCobro] = useState(false);
  const { selectedEmpresaId, empresas } = useEmpresa();

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [sendEmailCheckbox, setSendEmailCheckbox] = useState(true);
  const [emailData, setEmailData] = useState<{
    faturaId: string;
    clientId: string;
    clientName: string;
    recipientEmail: string;
    subject: string;
    body: string;
    token: string;
    totalHoras: number;
    totalValor: number;
    ajustesJson: any;
    dataEmissao: string;
    paymentTermName: string;
    paymentTermDays: number;
  } | null>(null);

  const [cobroConfirmFatura, setCobroConfirmFatura] = useState<any | null>(null);
  const [cobroDueDate, setCobroDueDate] = useState<string>('');
  const [cobroApplyIva, setCobroApplyIva] = useState<boolean>(false);
  const [cobroIvaPct, setCobroIvaPct] = useState<number>(23);

  useEffect(() => {
    if (cobroConfirmFatura) {
      const termDays = cobroConfirmFatura.client?.paymentTermDays || 30;
      const emissionDate = cobroConfirmFatura.data_emissao ? new Date(cobroConfirmFatura.data_emissao) : new Date();
      const dueDate = new Date(emissionDate);
      dueDate.setDate(dueDate.getDate() + termDays);
      setCobroDueDate(dueDate.toISOString().split('T')[0]);
      setCobroApplyIva(false);
      setCobroIvaPct(cobroConfirmFatura.ajustes_json?.iva_pct ?? 23);
    }
  }, [cobroConfirmFatura]);

  const handleOpenDispute = async (fatura: any) => {
    setSelectedDispute(fatura);
    setAdminModifiedHours(fatura.ajustes_json?.disputed_hours || {});
    setAdminEditingCell(null);
    setDisputeHours([]);
    setLoadingDisputeHours(true);
    try {
      const { data, error } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('*')
        .eq('fatura_id', fatura.id);

      if (error) throw error;
      
      const workerIds = Array.from(new Set((data || []).map((h: any) => h.worker_id).filter(Boolean)));
      let workersMap = new Map();
      if (workerIds.length > 0) {
        const { data: wData } = await supabase
          .schema('core_personal')
          .from('workers')
          .select('id, nome')
          .in('id', workerIds);
        workersMap = new Map((wData || []).map(w => [w.id, w]));
      }
      
      const mapped = (data || []).map(h => ({
        ...h,
        worker: workersMap.get(h.worker_id)
      }));
      setDisputeHours(mapped);
    } catch (err: any) {
      console.error('Erro ao buscar horas da disputa:', err);
      toast.error('Erro ao carregar detalhes das horas: ' + err.message);
    } finally {
      setLoadingDisputeHours(false);
    }
  };

  const handleAdminCellEdit = (workerId: string, dateKey: string, hours: number, originalHours: number) => {
    if (isNaN(hours) || hours < 0) return;

    setAdminModifiedHours(prev => {
      const workerPrev = { ...(prev[workerId] || {}) };
      if (hours === originalHours) {
        delete workerPrev[dateKey];
      } else {
        workerPrev[dateKey] = hours;
      }

      const next = { ...prev };
      if (Object.keys(workerPrev).length === 0) {
        delete next[workerId];
      } else {
        next[workerId] = workerPrev;
      }
      return next;
    });
    setAdminEditingCell(null);
  };

  const handleResolveDispute = async (aceitar: boolean) => {
    if (!selectedDispute) return;
    try {
      setResolvingDispute(true);
      
      await processarContestacaoFatura(selectedDispute.id, aceitar, aceitar ? adminModifiedHours : null);
      
      toast.success(
        aceitar 
          ? 'Contestação aceita com sucesso! As horas do ponto foram atualizadas e a fatura foi marcada como aprovada.' 
          : 'Contestação recusada. A fatura voltou para o status de pendente de aprovação.'
      );
      
      const targetFaturaId = selectedDispute.id;
      setSelectedDispute(null);
      await fetchFaturas();

      // Abre o modal de e-mail correspondente (aceite ou contestação)
      const updatedFatura = faturas.find(f => f.id === targetFaturaId);
      if (updatedFatura) {
        handleTriggerResendEmail(updatedFatura, aceitar);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao processar contestação: ' + err.message);
    } finally {
      setResolvingDispute(false);
    }
  };

  const handleGerarCobro = (fatura: any) => {
    setCobroConfirmFatura(fatura);
  };

  const handleConfirmGerarCobro = async () => {
    if (!cobroConfirmFatura) return;
    try {
      setIsGeneratingCobro(true);
      const currentEmpresa = empresas.find(e => e.id === selectedEmpresaId);
      const empresaNome = currentEmpresa ? currentEmpresa.nome : 'Stocco';

      const subtotal = Number(cobroConfirmFatura.total_valor || 0);
      const finalTotal = cobroApplyIva ? subtotal * (1 + cobroIvaPct / 100) : subtotal;

      await gerarCobroDaFatura(cobroConfirmFatura, empresaNome, cobroDueDate, finalTotal);
      
      toast.success('Cobrança gerada com sucesso!', {
        description: `O título de contas a receber correspondente à fatura #${cobroConfirmFatura.id.substring(0,8).toUpperCase()} foi inserido no módulo de Cobros.`
      });
      
      setCobroConfirmFatura(null);
      await fetchFaturas();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar cobrança: ' + err.message);
    } finally {
      setIsGeneratingCobro(false);
    }
  };

  const fetchFaturas = async () => {
    try {
      setLoading(true);
      const data = await getFaturasTracking(selectedEmpresaId);
      setFaturas(data);
    } catch (error: any) {
      toast.error('Erro ao carregar faturas', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaturas();
  }, [selectedEmpresaId]);

  const handleCopyLink = (token: string) => {
    if (!token) {
      toast.error('Token indisponível para esta fatura.');
      return;
    }
    const link = `${window.location.origin}/aprovacao-cliente/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de aprovação copiado para a área de transferência!');
  };

  const handleTriggerResendEmail = (fatura: any, isAcceptance?: boolean) => {
    const periodMonth = fatura.created_at ? new Date(fatura.created_at).getMonth() : new Date().getMonth();
    const periodYear = fatura.created_at ? new Date(fatura.created_at).getFullYear() : new Date().getFullYear();
    
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const periodStr = `${months[periodMonth]} de ${periodYear}`;
    
    const adj = fatura.ajustes_json || {};
    const incrementos = Number(adj.incrementos || 0);
    const reducoes = Number(adj.reducoes || 0);
    const ivaPct = Number(adj.iva_pct || 0);
    const finalTotal = (fatura.total_valor + incrementos - reducoes) * (1 + ivaPct / 100);

    const clientName = fatura.client?.nombre_comercial || fatura.client?.trade_name || fatura.client?.legal_name || 'Cliente';
    const docNumber = fatura.fatura_numero || fatura.atcud || `IF-${periodYear}/0001`;

    let subject = `MCS - Solicitação de Aprovação de Horas - ${clientName} - ${periodStr}`;
    const link = `${window.location.origin}/aprovacao-cliente/${fatura.magic_link_token}`;
    
    let body = `Olá,

Gostaríamos de solicitar a sua aprovação para o relatório de faturamento referente ao período de ${periodStr}.

Em anexo, você encontrará os seguintes documentos para a sua análise:
1. Informe de Facturación (${docNumber})
2. Folha de ponto detalhada com as datas trabalhadas
3. Fatura Pró-forma correspondente no valor de € ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Por favor, utilize o link abaixo para visualizar os documentos de forma interativa e aprovar ou contestar as horas:
${link}

Se tiver alguma dúvida, entre em contato respondendo a este e-mail.

Atenciosamente,
MCS - Gestão Comercial`;

    if (isAcceptance) {
      subject = `MCS - Aprovação de Ponto & Faturamento Ajustado - ${clientName} - ${periodStr}`;
      body = `Olá,

Informamos que aceitamos as correções propostas na contestação de horas referente ao período de ${periodStr}.

Os documentos de faturamento foram atualizados com sucesso e estão anexados a este e-mail para a sua conferência e arquivo:
1. Folha de ponto detalhada com as datas trabalhadas retificadas
2. Informe de Facturación (${docNumber}) atualizado
3. Fatura Pró-forma correspondente retificada no valor de € ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Qualquer dúvida ou necessidade de suporte, entre em contato respondendo a este e-mail.

Atenciosamente,
MCS - Gestão Comercial`;
    }

    const defaultEmails: string[] = [];
    const clientEmail = fatura.client?.billingEmail || fatura.client?.clientEmail || fatura.client?.email || fatura.client?.billing_email;
    if (clientEmail) {
      defaultEmails.push(clientEmail);
    }
    
    // Check some operations emails by default
    defaultEmails.push("valter@kr-industrial.com");
    defaultEmails.push("valter@gestaologinpro.com");

    setSelectedEmails(defaultEmails);
    setAdditionalEmails("");
    setSendEmailCheckbox(true);

    setEmailData({
      faturaId: fatura.id,
      clientId: fatura.client_id,
      clientName: clientName,
      recipientEmail: defaultEmails.join(", "),
      subject,
      body,
      token: fatura.magic_link_token,
      totalHoras: fatura.total_horas,
      totalValor: fatura.total_valor,
      ajustesJson: adj,
      dataEmissao: fatura.data_emissao,
      paymentTermName: fatura.client?.paymentTermName || 'Pronto Pagamento',
      paymentTermDays: fatura.client?.paymentTermDays || 0
    });
    
    setIsEmailModalOpen(true);
  };

  const handleCancelFaturaTracking = async (faturaId: string) => {
    const confirmDelete = window.confirm(
      'Tem certeza que deseja cancelar e excluir esta fatura?\n\nTodas as horas associadas retornarão para o estado pendente no painel de faturamento para que você possa refazer do zero.'
    );
    if (!confirmDelete) return;

    try {
      setLoading(true);
      await cancelarFatura(faturaId);
      toast.success('Fatura cancelada e horas liberadas com sucesso!');
      fetchFaturas();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao cancelar fatura: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData) return;
    
    const toEmails = [...selectedEmails];
    if (additionalEmails.trim()) {
      additionalEmails.split(',').forEach(e => {
        const trimmed = e.trim();
        if (trimmed && !toEmails.includes(trimmed)) {
          toEmails.push(trimmed);
        }
      });
    }

    if (toEmails.length === 0) {
      toast.error('Por favor, selecione ou digite pelo menos um destinatário de e-mail.');
      return;
    }

    try {
      setSendingEmail(true);
      
      // Detectar URL e converter em um link HTML clicável
      const linkRegex = /(https?:\/\/[^\s]+)/g;
      const htmlBody = emailData.body
        .replace(linkRegex, (url) => `<a href="${url}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${url}</a>`)
        .replace(/\n/g, '<br/>');

      const { error: functionErr } = await supabase.functions.invoke('send-order-notification', {
        body: {
          empresa_id: selectedEmpresaId,
          to_emails: toEmails,
          email_subject: emailData.subject,
          email_body: htmlBody,
          is_faturamento: true,
          fatura_code: emailData.faturaId.substring(0, 8).toUpperCase(),
          client_name: emailData.clientName
        }
      });

      if (functionErr) {
        console.error('Error invoking send-order-notification for billing tracking:', functionErr);
        toast.error('Falhou ao reenviar o e-mail: ' + functionErr.message);
      } else {
        toast.success(`E-mail com portal de aprovação reenviado com sucesso para ${toEmails.join(', ')}!`);
        setIsEmailModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao reenviar e-mail: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const filteredFaturas = faturas.filter(f => {
    const query = searchQuery.toLowerCase();
    const matchesId = f.id.toLowerCase().includes(query);
    const matchesClient = f.client?.nombre_comercial?.toLowerCase().includes(query) || false;
    const matchesClientCode = f.client?.codigo?.toLowerCase().includes(query) || false;
    return matchesId || matchesClient || matchesClientCode;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_client_approval':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 flex w-max items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5" />
            Aguardando Cliente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 flex w-max items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aprovado
          </Badge>
        );
      case 'disputed':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 flex w-max items-center gap-1.5 font-medium">
            <XCircle className="w-3.5 h-3.5" />
            Contestado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-800 flex w-max items-center gap-1.5 font-medium">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-full w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Tracking de Faturas</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o status e a aprovação das faturas enviadas aos clientes.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Painel de Rastreamento</CardTitle>
              <CardDescription>Monitore as solicitações de aprovação ativas</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar fatura ou cliente..."
                className="pl-9 bg-white dark:bg-slate-950"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFaturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6">
              <p className="text-lg font-medium text-muted-foreground">Nenhuma fatura encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-transparent">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 py-4">Fatura ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaturas.map((fatura) => {
                  const { dueDateStr, daysText, isOverdue, daysVal } = getDueDateAndRemaining(
                    fatura.data_emissao,
                    fatura.client?.paymentTermDays ?? null
                  );

                  return (
                    <TableRow key={fatura.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <TableCell className="font-medium pl-6 text-slate-900 dark:text-slate-100">
                        #{fatura.id.split('-')[0].toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex flex-col gap-1 text-left">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {fatura.client?.codigo ? (
                              <span className="text-slate-400 font-normal bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">
                                {fatura.client.codigo}
                              </span>
                            ) : null}
                            <span className="font-bold text-slate-900 dark:text-slate-100">{fatura.client?.nombre_comercial || 'Cliente Desconhecido'}</span>
                          </div>
                          {fatura.client?.viesApplicable && (
                            <Badge 
                              variant="outline" 
                              className={`text-[9px] font-extrabold px-1.5 py-0 w-fit flex items-center gap-1 shrink-0 ${
                                fatura.client.viesValid 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' 
                                  : fatura.client.viesStatus === 'invalid'
                                    ? 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                                    : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                              }`}
                              title={fatura.client.viesLastCheckedAt ? `Última consulta VIES: ${new Date(fatura.client.viesLastCheckedAt).toLocaleString('pt-PT')}` : 'Nunca verificado no VIES'}
                            >
                              VIES: {fatura.client.viesValid ? 'Ativo' : fatura.client.viesStatus === 'invalid' ? 'Inválido' : 'Pendente'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fatura.data_emissao ? new Date(fatura.data_emissao).toLocaleDateString() : '--/--/----'}
                      </TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400 text-sm">
                        {fatura.client?.paymentTermName || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {dueDateStr}
                          </span>
                          {(fatura.status === 'pending_client_approval' || fatura.status === 'disputed') && daysText && (
                            <span className={`text-[10px] font-bold ${
                              isOverdue 
                                ? 'text-rose-600 dark:text-rose-400' 
                                : daysVal === 0 
                                  ? 'text-amber-600 dark:text-amber-500' 
                                  : 'text-slate-500 dark:text-slate-400'
                            }`}>
                              {daysText}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {fatura.total_horas ? `${fatura.total_horas.toFixed(2)}h` : '0.00h'}
                        <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                          {fatura.total_valor ? `€ ${fatura.total_valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '€ 0,00'}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(fatura.status)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-3">
                          {(fatura.status === 'pending_client_approval' || fatura.status === 'disputed') && (
                            <>
                              <button
                                onClick={() => handleCopyLink(fatura.magic_link_token)}
                                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copiar Link
                              </button>
                              
                              <button
                                onClick={() => handleTriggerResendEmail(fatura)}
                                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5" /> Reenviar E-mail
                              </button>

                              <button
                                onClick={() => handleCancelFaturaTracking(fatura.id)}
                                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Cancelar Fatura
                              </button>
                            </>
                          )}
                          {fatura.status === 'disputed' && (
                            <button
                              onClick={() => handleOpenDispute(fatura)}
                              className="inline-flex items-center gap-1 text-sm text-red-650 hover:text-red-755 dark:text-red-400 dark:hover:text-red-350 font-medium transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver Motivo
                            </button>
                          )}
                          {fatura.status === 'approved' && (
                            fatura.ajustes_json?.cobro_gerado ? (
                              <span className="text-xs text-emerald-650 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg px-2.5 py-1.5 font-bold inline-flex items-center gap-1 shadow-sm">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Cobros Gerado
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleCopyLink(fatura.magic_link_token)}
                                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copiar Link
                                </button>
                                
                                <button
                                  onClick={() => handleTriggerResendEmail(fatura, true)}
                                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" /> Reenviar E-mail
                                </button>

                                <button
                                  onClick={() => handleGerarCobro(fatura)}
                                  disabled={isGeneratingCobro}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                  {isGeneratingCobro ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                  Gerar Cobros
                                </button>
                              </>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dispute Reason Dialog */}
      <Dialog open={selectedDispute !== null} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DialogContent className="max-w-[98%] w-[98vw] dark:bg-slate-900 dark:border-slate-800">
          {(() => {
            if (!selectedDispute) return null;
            
            const fileUrl = selectedDispute.ajustes_json?.dispute_file_url;
            const dataEmissaoStr = selectedDispute.data_emissao || new Date().toISOString().split('T')[0];
            const termDays = selectedDispute.client?.paymentTermDays || 30;
            const emissionDate = selectedDispute.data_emissao ? new Date(selectedDispute.data_emissao) : new Date();
            const dueDate = new Date(emissionDate);
            dueDate.setDate(dueDate.getDate() + termDays);
            const dataVencimentoStr = dueDate.toISOString().split('T')[0];
            const year = new Date(dataEmissaoStr).getFullYear();

            // Group by worker for matrix
            const groupedDisputeWorkers = disputeHours.length > 0 ? (() => {
              const workersMap = new Map<string, {
                workerId: string;
                workerName: string;
                horasDiarias: Record<string, number>;
              }>();

              disputeHours.forEach(h => {
                const wId = h.worker_id;
                if (!wId) return;

                if (!workersMap.has(wId)) {
                  workersMap.set(wId, {
                    workerId: wId,
                    workerName: h.worker?.nome || 'Colaborador',
                    horasDiarias: {}
                  });
                }

                const wObj = workersMap.get(wId)!;
                wObj.horasDiarias[h.data_trabalho] = h.horas_totais;
              });

              return Array.from(workersMap.values());
            })() : [];

            const { disputeYear, disputeMonth } = (() => {
              if (disputeHours && disputeHours.length > 0) {
                const firstDate = disputeHours[0].data_trabalho;
                const parts = firstDate.split('-');
                return { disputeYear: parseInt(parts[0]), disputeMonth: parseInt(parts[1]) - 1 };
              }
              const today = new Date();
              return { disputeYear: today.getFullYear(), disputeMonth: today.getMonth() };
            })();

            const disputeDaysArray = (() => {
              const numDays = new Date(disputeYear, disputeMonth + 1, 0).getDate();
              return Array.from({ length: numDays }, (_, i) => i + 1);
            })();

            // Load adjustments or defaults
            const adjustments = (() => {
              const adj = selectedDispute.ajustes_json || {};
              return {
                incrementos: adj.incrementos !== undefined ? Number(adj.incrementos) : 0,
                incrementosDesc: adj.incrementos_desc || '',
                reducoes: adj.reducoes !== undefined ? Number(adj.reducoes) : 0,
                reducoesDesc: adj.reducoes_desc || '',
                ivaPct: adj.iva_pct !== undefined ? Number(adj.iva_pct) : 21,
                iban: adj.iban || 'BANCO COMERCIAL PORTUGUÊS (BCP)\nIBAN: PT50 0033 0000 1234 5678 9012 3\nSWIFT: BCPTPLPT',
                descricaoServico: adj.descricao_servico || 'Prestação de serviços de mão de obra temporária especializada nas instalações do cliente.'
              };
            })();

            const totalBaseVal = (() => {
              let sum = 0;
              disputeHours.forEach(h => {
                const proposed = adminModifiedHours[h.worker_id]?.[h.data_trabalho];
                const hoursVal = proposed !== undefined ? proposed : h.horas_totais;
                sum += hoursVal * (h.tarifa_faturada || 0);
              });
              return sum;
            })();

            const finalTotalVal = (totalBaseVal + adjustments.incrementos - adjustments.reducoes) * (1 + adjustments.ivaPct / 100);

            const totalHorasCalculadas = (() => {
              let sum = 0;
              disputeHours.forEach(h => {
                const proposed = adminModifiedHours[h.worker_id]?.[h.data_trabalho];
                sum += proposed !== undefined ? proposed : h.horas_totais;
              });
              return sum;
            })();

            const groupedDisputeWorkersEnriched = (() => {
              const workersMap = new Map<string, {
                workerId: string;
                workerName: string;
                totalHoras: number;
                tarifa: number;
                totalValor: number;
              }>();

              disputeHours.forEach(h => {
                const wId = h.worker_id;
                if (!wId) return;

                const proposed = adminModifiedHours[wId]?.[h.data_trabalho];
                const hoursVal = proposed !== undefined ? proposed : h.horas_totais;

                if (!workersMap.has(wId)) {
                  workersMap.set(wId, {
                    workerId: wId,
                    workerName: h.worker?.nome || 'Colaborador',
                    totalHoras: 0,
                    tarifa: h.tarifa_faturada || 0,
                    totalValor: 0
                  });
                }

                const wObj = workersMap.get(wId)!;
                wObj.totalHoras += hoursVal;
                wObj.totalValor += hoursVal * (h.tarifa_faturada || 0);
              });

              return Array.from(workersMap.values());
            })();

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-700">
                    <XCircle className="w-6 h-6" />
                    Análise de Contestação - Fatura #{selectedDispute.id.substring(0, 8).toUpperCase()}
                  </DialogTitle>
                  <DialogDescription className="text-base pt-1">
                    Revise o motivo fornecido pelo cliente e as discrepâncias apontadas na folha de ponto.
                  </DialogDescription>
                </DialogHeader>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-805 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl mt-2">
                  <button
                    type="button"
                    onClick={() => setDisputeActiveTab('resumo')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                      disputeActiveTab === 'resumo'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-650 hover:bg-slate-105 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    Resumo de Horas (Folha de Ponto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeActiveTab('informe')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                      disputeActiveTab === 'informe'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-650 hover:bg-slate-105 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    Informe Pró-forma
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeActiveTab('factura')}
                    className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold transition-all ${
                      disputeActiveTab === 'factura'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-650 hover:bg-slate-105 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    Factura Única AT
                  </button>
                </div>

                <div className="py-2 space-y-4 max-h-[62vh] overflow-y-auto text-left text-xs font-semibold">
                  
                  {/* Resumo de Horas Tab */}
                  {disputeActiveTab === 'resumo' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Descritivo */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Comentário do Cliente</span>
                          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-805 text-slate-800 dark:text-slate-200 italic whitespace-pre-wrap min-h-[58px]">
                            "{selectedDispute.observacoes_cliente || 'Nenhuma justificativa textual fornecida.'}"
                          </div>
                        </div>

                        {/* Documento Anexo */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-1.5">Documento de Comprovação</span>
                          {fileUrl ? (
                            <a 
                              href={fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-4 bg-blue-50 dark:bg-slate-950/40 hover:bg-blue-105 text-blue-700 border border-blue-200 dark:border-blue-900 rounded-xl font-bold transition-all w-full"
                            >
                              <FileText className="w-5 h-5 text-rose-500" />
                              <span>Visualizar Documento de Comprovação (Relógio Ponto / PDF)</span>
                              <ExternalLink className="w-4 h-4 ml-auto" />
                            </a>
                          ) : (
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border text-muted-foreground italic min-h-[58px] flex items-center justify-center">
                              Nenhum documento de comprovante foi anexado pelo cliente.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tabela de Diferenças (Horizontal Matrix) */}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1 border-b dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Planilha Comparativa de Ponto (30 Dias)</span>
                          <span className="text-[9px] text-amber-700 dark:text-amber-300 font-extrabold bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                            Instrução: Clique nas células para alterar ou ajustar os valores das horas manualmente!
                          </span>
                        </div>
                        {loadingDisputeHours ? (
                          <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                          </div>
                        ) : groupedDisputeWorkers.length === 0 ? (
                          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-center border text-muted-foreground">
                            Nenhum registro de hora encontrado.
                          </div>
                        ) : (
                          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto bg-white dark:bg-slate-950 p-4 text-[10px]">
                            <Table className="border border-slate-105 dark:border-slate-900 rounded">
                              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                <TableRow>
                                  <TableHead className="font-bold pl-4">Trabalhador</TableHead>
                                  {disputeDaysArray.map(day => {
                                    const wDay = getWeekDayLabel(day, disputeYear, disputeMonth);
                                    const isWk = isWeekend(day, disputeYear, disputeMonth);
                                    return (
                                      <TableHead key={day} className={`text-center font-extrabold text-[9px] md:text-[10px] p-1 min-w-[28px] max-w-[38px] ${isWk ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-x border-slate-100 dark:border-slate-800' : 'border-x border-slate-100 dark:border-slate-850'}`}>
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span>{String(day).padStart(2, '0')}</span>
                                          <span className="text-[6.5px] md:text-[7.5px] text-slate-400 font-normal uppercase tracking-tight">{wDay}</span>
                                        </div>
                                      </TableHead>
                                    );
                                  })}
                                  <TableHead className="text-right font-extrabold pr-4 text-xs">TOTAL</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {groupedDisputeWorkers.map(worker => {
                                  const workerTotal = disputeDaysArray.reduce((sum, day) => {
                                    const dateKey = `${disputeYear}-${String(disputeMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const proposedVal = adminModifiedHours[worker.workerId]?.[dateKey];
                                    if (proposedVal !== undefined) return sum + proposedVal;
                                    const originalVal = worker.horasDiarias[dateKey] || 0;
                                    return sum + originalVal;
                                  }, 0);

                                  return (
                                    <TableRow key={worker.workerId} className="hover:bg-slate-50/50">
                                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200 pl-4 py-3 text-xs">{worker.workerName}</TableCell>
                                      {disputeDaysArray.map(day => {
                                        const dateKey = `${disputeYear}-${String(disputeMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const originalVal = worker.horasDiarias[dateKey] || 0;

                                        const isEditing = adminEditingCell?.workerId === worker.workerId && adminEditingCell?.dateKey === dateKey;
                                        const proposedVal = adminModifiedHours[worker.workerId]?.[dateKey];
                                        const hasDispute = proposedVal !== undefined;
                                        const displayVal = hasDispute ? proposedVal : originalVal;
                                        const isWk = isWeekend(day, disputeYear, disputeMonth);

                                        if (isEditing) {
                                          return (
                                            <TableCell key={day} className="p-0 text-center min-w-[30px] border-x border-slate-100 dark:border-slate-800">
                                              <input 
                                                type="number" 
                                                step="0.5"
                                                min="0"
                                                max="24"
                                                defaultValue={displayVal || 0}
                                                className="w-9 h-7 text-center text-xs p-0 border border-blue-500 rounded bg-blue-50 text-blue-900 font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                                                onBlur={(e) => handleAdminCellEdit(worker.workerId, dateKey, Number(e.target.value), originalVal)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    handleAdminCellEdit(worker.workerId, dateKey, Number((e.target as HTMLInputElement).value), originalVal);
                                                  } else if (e.key === 'Escape') {
                                                    setAdminEditingCell(null);
                                                  }
                                                }}
                                                autoFocus
                                              />
                                            </TableCell>
                                          );
                                        }

                                        return (
                                          <TableCell 
                                            key={day} 
                                            onClick={() => setAdminEditingCell({ workerId: worker.workerId, dateKey })}
                                            className={`text-center p-1 text-[10px] md:text-[11px] min-w-[28px] max-w-[38px] select-none cursor-pointer transition-all border-x border-slate-100 dark:border-slate-850 hover:bg-amber-105 hover:text-amber-900 ${
                                              isWk
                                                ? hasDispute
                                                  ? 'bg-amber-100/80 dark:bg-amber-950/30 font-extrabold text-blue-650'
                                                  : originalVal > 0
                                                    ? 'bg-rose-105/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 font-extrabold'
                                                    : 'bg-rose-50/25 dark:bg-rose-950/5 text-slate-300'
                                                : hasDispute
                                                  ? 'bg-amber-50 dark:bg-amber-950/20 font-extrabold text-blue-650'
                                                  : originalVal > 0
                                                    ? 'bg-slate-55/50 dark:bg-slate-800/10'
                                                    : 'text-slate-300'
                                            }`}
                                          >
                                            {hasDispute ? (
                                              <div className="flex flex-col items-center leading-none py-0.5">
                                                <span className="line-through text-red-500 text-[8px]">{originalVal}</span>
                                                <span className="font-extrabold text-blue-650 text-[10px]">{proposedVal}</span>
                                              </div>
                                            ) : (
                                              <span>
                                                {originalVal > 0 ? originalVal : '-'}
                                              </span>
                                            )}
                                          </TableCell>
                                        );
                                      })}
                                      <TableCell className="text-right font-extrabold text-slate-900 dark:text-slate-100 pr-4 py-3 text-xs">
                                        {workerTotal.toFixed(1)}h
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Informe Pró-forma Tab */}
                  {disputeActiveTab === 'informe' && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-900/50 flex justify-center text-xs rounded-xl">
                      <div className="w-full max-w-[800px] bg-white dark:bg-slate-950 p-6 shadow border border-slate-200 dark:border-slate-850 text-slate-850 dark:text-slate-200 rounded text-left">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-slate-100 dark:border-slate-900 pb-4 mb-4">
                          <div className="space-y-1">
                            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                              {selectedDispute.client?.nombre_comercial ? 'STO - STOCCO' : 'MCS'}
                            </h3>
                            <p className="text-[9px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest">Informe de Facturación</p>
                            <p className="text-[8px] text-muted-foreground">MCS - Gestão Comercial</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-bold text-slate-500 uppercase text-[8px]">Documento</p>
                            <p className="font-bold text-slate-900 dark:text-slate-100">IF-{year}/0760</p>
                            <p className="text-muted-foreground mt-1 text-[10px]">Emissão: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                            <p className="text-muted-foreground text-[10px]">Vencimento: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                          </div>
                        </div>

                        {/* Emissor e Cliente */}
                        <div className="grid grid-cols-2 gap-4 mb-4 text-[10px]">
                          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5">
                            <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">Emissor</p>
                            <p className="font-bold text-slate-900 dark:text-slate-150">STOCCO LDA</p>
                            <p className="text-muted-foreground">CIF/NIF: PT517834747</p>
                            <p className="text-muted-foreground">R. São Tomé e Príncipe, 287 - Vila Nova de Gaia</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5">
                            <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">Cliente</p>
                            <p className="font-bold text-slate-900 dark:text-slate-150">{selectedDispute.client?.nombre_comercial}</p>
                            <p className="text-muted-foreground">NIF: ES55350245</p>
                            <p className="text-muted-foreground">Pol. Ind. MERCADERIES C/1 NAU</p>
                          </div>
                        </div>

                        {/* Resumo de Importe */}
                        <h5 className="font-bold uppercase text-slate-400 tracking-wider mb-1.5 text-[8px]">Resumen de Importe</h5>
                        <Table className="border border-slate-150 dark:border-slate-850 rounded mb-4 text-[10px]">
                          <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
                            <TableRow>
                              <TableHead className="font-bold">Concepto</TableHead>
                              <TableHead className="text-right font-bold w-28">Valor (€)</TableHead>
                              <TableHead className="font-bold">Descripción</TableHead>
                              <TableHead className="text-right font-bold w-32">Total (€)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold">Importe total</TableCell>
                              <TableCell className="text-right font-semibold">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                              <TableCell className="text-muted-foreground">{adjustments.descricaoServico}</TableCell>
                              <TableCell className="text-right font-semibold font-mono">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            {Number(adjustments.incrementos) > 0 && (
                              <TableRow>
                                <TableCell className="font-medium text-emerald-600">Incrementos</TableCell>
                                <TableCell className="text-right font-semibold text-emerald-600">€ {Number(adjustments.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-muted-foreground">{adjustments.incrementosDesc || 'Adicional'}</TableCell>
                                <TableCell className="text-right font-semibold text-emerald-600 font-mono">€ {Number(adjustments.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            )}
                            {Number(adjustments.reducoes) > 0 && (
                              <TableRow>
                                <TableCell className="font-medium text-rose-600">Reducciones</TableCell>
                                <TableCell className="text-right font-semibold text-rose-600">€ -{Number(adjustments.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell className="text-muted-foreground">{adjustments.reducoesDesc || 'Desconto'}</TableCell>
                                <TableCell className="text-right font-semibold text-rose-600 font-mono">€ -{Number(adjustments.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            )}
                            <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                              <TableCell className="font-bold text-slate-800 dark:text-slate-200" colSpan={3}>Total a facturar</TableCell>
                              <TableCell className="text-right font-extrabold text-slate-900 dark:text-white font-mono">
                                € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        <div className="text-center font-bold bg-slate-105 dark:bg-slate-900 py-1 rounded text-slate-700 dark:text-slate-300 mb-4 text-[9px]">
                          OBRA: {selectedDispute.ajustes_json?.obra || 'SIN OBRA'}
                        </div>

                        {/* Relação de Trabalhadores */}
                        <h5 className="font-bold uppercase text-slate-400 tracking-wider mb-1.5 text-[8px]">Relación de Trabajadores</h5>
                        <Table className="border border-slate-150 dark:border-slate-850 rounded mb-4 text-[10px]">
                          <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
                            <TableRow>
                              <TableHead className="font-bold pl-4">Trabajador</TableHead>
                              <TableHead className="text-right font-bold w-40">Cantidad de horas</TableHead>
                              <TableHead className="text-right font-bold w-40">Precio hora (€)</TableHead>
                              <TableHead className="text-right font-bold w-40 pr-4">Total (€)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupedDisputeWorkersEnriched.map(w => (
                              <TableRow key={w.workerId}>
                                <TableCell className="font-semibold text-slate-800 dark:text-slate-250 pl-4">{w.workerName}</TableCell>
                                <TableCell className="text-right font-medium">{w.totalHoras.toFixed(2)}h</TableCell>
                                <TableCell className="text-right font-medium">€ {w.tarifa.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold pr-4 font-mono">€ {w.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                              <TableCell className="font-bold pl-4">Totales</TableCell>
                              <TableCell className="text-right font-bold">{totalHorasCalculadas.toFixed(2)}h</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right font-extrabold pr-4 font-mono">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        {/* Informações Bancárias */}
                        <div className="border-t border-slate-100 dark:border-slate-900 pt-3 text-muted-foreground space-y-0.5 font-medium leading-relaxed text-[9px]">
                          <span className="font-bold uppercase text-slate-400 text-[7px] block mb-0.5">Dados de Depósito / IBAN</span>
                          <p className="whitespace-pre-line font-mono">{adjustments.iban}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Factura Única Tab */}
                  {disputeActiveTab === 'factura' && (
                    <div className="p-4 bg-slate-100 dark:bg-slate-900/50 flex justify-center text-xs rounded-xl">
                      <div className="w-full max-w-[800px] bg-white dark:bg-slate-950 p-6 shadow border border-slate-200 dark:border-slate-850 text-slate-850 dark:text-slate-200 rounded text-left relative">
                        {/* Top row */}
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                              Factura 2026/0347
                            </h3>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">ORIGINAL</p>
                          </div>
                          <div className="border border-slate-200 dark:border-slate-800 p-1 bg-white dark:bg-slate-900 rounded shadow-sm">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center text-[6px] text-slate-400 font-bold border border-dashed border-slate-300 dark:border-slate-800">
                              <span>MOCK QR</span>
                            </div>
                          </div>
                        </div>

                        {/* De / Para */}
                        <div className="grid grid-cols-2 gap-6 mb-6 leading-relaxed text-[10px]">
                          <div>
                            <p className="font-bold text-[7px] text-slate-400 uppercase">De</p>
                            <p className="font-bold text-slate-900 dark:text-slate-150">STOCCO LDA</p>
                            <p className="text-muted-foreground">Rua Padre António Maria Pinho, n.º 353</p>
                            <p className="text-muted-foreground">4460-853 Vila Nova de Gaia</p>
                            <p className="text-muted-foreground">NIF: PT517834747</p>
                            <p className="text-muted-foreground mt-1.5 font-semibold">Conta:</p>
                            <p className="text-muted-foreground font-mono whitespace-pre-line text-[9px]">{adjustments.iban.split('\n')[0]}</p>
                          </div>
                          <div>
                            <p className="font-bold text-[7px] text-slate-400 uppercase">Para</p>
                            <p className="font-bold text-slate-900 dark:text-slate-150">{selectedDispute.client?.nombre_comercial}</p>
                            <p className="text-muted-foreground">AVENIDA DE LA INDUSTRIA 14, 25190</p>
                            <p className="text-muted-foreground">LLEIDA, Espanha</p>
                            <p className="text-muted-foreground mt-1.5">Data Emissão: <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                            <p className="text-muted-foreground">Data Vencimento: <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                          </div>
                        </div>

                        {/* Tabela de Itens */}
                        <div className="bg-orange-500 text-white font-bold uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0 text-[8px]">
                          Lista de Artigos
                        </div>
                        <Table className="border border-slate-200 dark:border-slate-800 rounded-b mb-4 text-[10px]">
                          <TableHeader className="bg-slate-50 dark:bg-slate-900/80">
                            <TableRow>
                              <TableHead className="font-bold text-slate-700 dark:text-slate-300 pl-3">Artigo</TableHead>
                              <TableHead className="font-bold text-slate-700 dark:text-slate-300">Descrição</TableHead>
                              <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300 w-24">Qtd.</TableHead>
                              <TableHead className="font-bold text-slate-700 dark:text-slate-300 w-16">Un.</TableHead>
                              <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300 w-24">Pr. Unitário</TableHead>
                              <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300 w-24 pr-3">Valor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-semibold pl-3">PREST-SERV</TableCell>
                              <TableCell className="text-muted-foreground">{adjustments.descricaoServico}</TableCell>
                              <TableCell className="text-right">{totalHorasCalculadas.toFixed(2)}</TableCell>
                              <TableCell>UN</TableCell>
                              <TableCell className="text-right">€ {(totalBaseVal / (totalHorasCalculadas || 1)).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-bold pr-3 font-mono">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            {Number(adjustments.incrementos) > 0 && (
                              <TableRow>
                                <TableCell className="font-semibold text-emerald-600 pl-3">INC-ADIC</TableCell>
                                <TableCell className="text-muted-foreground">{adjustments.incrementosDesc || 'Incremento Adicional'}</TableCell>
                                <TableCell className="text-right">1.00</TableCell>
                                <TableCell>UN</TableCell>
                                <TableCell className="text-right">€ {Number(adjustments.incrementos).toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold text-emerald-600 pr-3 font-mono">€ {Number(adjustments.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            )}
                            {Number(adjustments.reducoes) > 0 && (
                              <TableRow>
                                <TableCell className="font-semibold text-rose-600 pl-3">DESC-COM</TableCell>
                                <TableCell className="text-muted-foreground">{adjustments.reducoesDesc || 'Redução Comercial'}</TableCell>
                                <TableCell className="text-right">1.00</TableCell>
                                <TableCell>UN</TableCell>
                                <TableCell className="text-right">€ -{Number(adjustments.reducoes).toFixed(2)}</TableCell>
                                <TableCell className="text-right font-bold text-rose-600 pr-3 font-mono">€ -{Number(adjustments.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>

                        {/* Resumo da Fatura */}
                        <div className="bg-orange-500 text-white font-bold uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0 text-[8px]">
                          Resumo
                        </div>
                        <Table className="border border-slate-200 dark:border-slate-800 rounded-b mb-4 text-[10px]">
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-bold" colSpan={3}>Subtotal da Obra</TableCell>
                              <TableCell className="text-right font-bold w-40 pr-3 font-mono">€ {(totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold" colSpan={3}>IVA {adjustments.ivaPct}%</TableCell>
                              <TableCell className="text-right font-bold w-40 pr-3 font-mono">€ {((totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)) * Number(adjustments.ivaPct || 0)/100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                            <TableRow className="bg-orange-50/50 dark:bg-orange-950/20">
                              <TableCell className="font-extrabold text-orange-850 dark:text-orange-300" colSpan={3}>Total da Fatura</TableCell>
                              <TableCell className="text-right font-extrabold text-orange-950 dark:text-orange-205 text-[11px] pr-3 font-mono">
                                € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>

                        {/* Condições de IVA */}
                        <div className="text-[8px] text-muted-foreground mb-4 font-semibold">
                          Condições de Enquadramento de IVA:<br/>
                          (1) M09-IVA - autoliquidação
                        </div>

                        {/* Rodapé */}
                        <div className="border-t border-slate-100 dark:border-slate-900 pt-3 flex justify-between text-[8px] text-muted-foreground font-medium">
                          <div>
                            <p className="font-bold uppercase mb-0.5">Local de Carga</p>
                            <p>Rua Conselheiro Fonseca, n.º 157</p>
                            <p>4405-853 Vila Nova de Gaia</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold uppercase mb-0.5">Local de Descarga</p>
                            <p>AVENIDA DE LA INDUSTRIA 14, 25190 LLEIDA</p>
                          </div>
                        </div>
                        <div className="text-center text-[7px] text-muted-foreground mt-3 italic font-semibold">
                          Rexx - Processado por Programa Certificado nº 1123/AT
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t dark:border-slate-800 pt-4 mt-2">
                  <Button variant="outline" onClick={() => setSelectedDispute(null)} disabled={resolvingDispute}>
                    Fechar
                  </Button>
                  <Button variant="outline" onClick={() => handleResolveDispute(false)} disabled={resolvingDispute} className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700">
                    {resolvingDispute ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Recusar & Comentar
                  </Button>
                  <Button onClick={() => handleResolveDispute(true)} disabled={resolvingDispute} className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                    {resolvingDispute ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Aceitar Proposta & Atualizar Ponto
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Diálogo para Reenviar E-mail */}
      <Dialog open={isEmailModalOpen} onOpenChange={(open) => !open && setIsEmailModalOpen(false)}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl p-0 overflow-hidden flex flex-col lg:flex-row dark:bg-slate-900 dark:border-slate-800">
          
          {(() => {
            if (!emailData) return null;

            const currentAdj = emailData.ajustesJson || {};
            const currentTotalBase = emailData.totalValor;
            const currentFinalTotal = (currentTotalBase + Number(currentAdj.incrementos || 0) - Number(currentAdj.reducoes || 0)) * (1 + Number(currentAdj.iva_pct || 0)/100);

            // Available emails list
            const emailOptions: Array<{ id: string; email: string; label: string }> = [];
            
            // Fixed operations copy emails
            emailOptions.push({
              id: 'valter_kr',
              email: 'valter@kr-industrial.com',
              label: 'valter@kr-industrial.com (Cópia Operações)'
            });
            emailOptions.push({
              id: 'thevalter',
              email: 'thevalter@gmail.com',
              label: 'thevalter@gmail.com'
            });
            emailOptions.push({
              id: 'valter_loginpro',
              email: 'valter@gestaologinpro.com',
              label: 'valter@gestaologinpro.com (Gestão)'
            });
            emailOptions.push({
              id: 'valtencir_loginpro',
              email: 'valtencir@gestaologinpro.com',
              label: 'valtencir@gestaologinpro.com'
            });

            return (
              <>
                {/* Left Column: Summary of Billing */}
                <div className="w-full lg:w-1/2 bg-slate-50 dark:bg-slate-950 p-6 border-r border-slate-200 dark:border-slate-800 flex flex-col space-y-4 max-h-[80vh] overflow-y-auto text-left text-xs font-semibold">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Resumo do Faturamento</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Faturamento Operacional | Fatura #{emailData.faturaId.split('-')[0].toUpperCase()}</p>
                  </div>

                  <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm leading-relaxed">
                    <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Cliente</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{emailData.clientName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Empresa</span>
                        <span className="font-medium">Stocco</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Total de Horas</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{emailData.totalHoras.toFixed(2)}h</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Valor de Base</span>
                        <span className="font-bold text-blue-600">€ {currentTotalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ajustes no Faturamento */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 border-b dark:border-slate-800 pb-1 text-[11px] uppercase tracking-wider">Ajustes Aplicados</h4>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-500 uppercase border-b dark:border-slate-800">
                            <th className="p-2.5">Ajuste</th>
                            <th className="p-2.5 text-right">Valor (€)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b dark:border-slate-800">
                            <td className="p-2.5 font-medium text-slate-600 dark:text-slate-350">Base da Obra</td>
                            <td className="p-2.5 text-right font-semibold">€ {currentTotalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          {Number(currentAdj.incrementos) > 0 && (
                            <tr className="border-b dark:border-slate-800 text-emerald-600">
                              <td className="p-2.5 font-medium">Acréscimos ({currentAdj.incrementos_desc || 'Adicional Obra'})</td>
                              <td className="p-2.5 text-right font-bold">€ +{Number(currentAdj.incrementos).toFixed(2)}</td>
                            </tr>
                          )}
                          {Number(currentAdj.reducoes) > 0 && (
                            <tr className="border-b dark:border-slate-800 text-rose-600">
                              <td className="p-2.5 font-medium">Reduções ({currentAdj.reducoes_desc || 'Desconto Comercial'})</td>
                              <td className="p-2.5 text-right font-bold">€ -{Number(currentAdj.reducoes).toFixed(2)}</td>
                            </tr>
                          )}
                          <tr className="bg-slate-50 dark:bg-slate-950 font-extrabold border-t dark:border-slate-800">
                            <td className="p-2.5 text-slate-800 dark:text-slate-200">Total a Faturar (IVA {currentAdj.iva_pct || 0}%)</td>
                            <td className="p-2.5 text-right text-blue-600 font-mono text-[12px]">€ {currentFinalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Documentos Anexados */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-indigo-600 dark:text-indigo-400 border-b dark:border-slate-800 pb-1 text-[11px] uppercase tracking-wider">Documentos Anexos (PDF)</h4>
                    <div className="flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span>Relatorio_Datas_Trabalhadas.pdf</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span>Informe_Facturacion.pdf</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-350">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span>Factura_Pró-forma.pdf</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Compose Email */}
                <div className="w-full lg:w-1/2 p-6 flex flex-col space-y-4 max-h-[80vh] overflow-y-auto text-left text-xs font-semibold">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Configuração de Envio</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Determine os destinatários e edite o e-mail.</p>
                  </div>

                  {/* Checkbox trigger */}
                  <div className="flex items-center space-x-2 border bg-blue-50/20 dark:bg-slate-950/20 dark:border-slate-800 p-3 rounded-xl">
                    <input
                      type="checkbox"
                      id="send_email_chk_billing_tracking"
                      checked={sendEmailCheckbox}
                      onChange={e => setSendEmailCheckbox(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="send_email_chk_billing_tracking" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      Enviar notificação por e-mail para o cliente?
                    </label>
                  </div>

                  {sendEmailCheckbox && (
                    <div className="space-y-4">
                      {/* Recipients checklists */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Destinatários do E-mail</label>
                        <div className="grid grid-cols-1 gap-2 border dark:border-slate-800 p-3 rounded-lg max-h-[160px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/20">
                          {emailOptions.map(opt => (
                            <label key={opt.id} className="flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedEmails.includes(opt.email)}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSelectedEmails(prev => [...prev, opt.email]);
                                  } else {
                                    setSelectedEmails(prev => prev.filter(email => email !== opt.email));
                                  }
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="truncate">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* E-mails Adicionais */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 dark:text-slate-400">E-mails Adicionais (separados por vírgula)</label>
                        <Input
                          value={additionalEmails}
                          onChange={e => setAdditionalEmails(e.target.value)}
                          placeholder="financeiro@empresa.com, diretoria@empresa.com"
                          className="h-9 text-xs dark:bg-slate-950 dark:border-slate-800"
                        />
                      </div>

                      {/* Assunto */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 dark:text-slate-400">Assunto do E-mail</label>
                        <Input
                          value={emailData.subject}
                          onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                          placeholder="Assunto do e-mail"
                          className="h-9 text-xs font-bold dark:bg-slate-950 dark:border-slate-800"
                        />
                      </div>

                      {/* Corpo do E-mail */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 dark:text-slate-400">Corpo do E-mail</label>
                        <Textarea
                          value={emailData.body}
                          onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                          className="min-h-[200px] text-xs resize-y font-mono font-medium leading-relaxed dark:bg-slate-950 dark:border-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                    <Button variant="outline" onClick={() => setIsEmailModalOpen(false)} disabled={sendingEmail}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSendEmail} disabled={sendingEmail} className="bg-blue-600 hover:bg-blue-700 text-white border-none">
                      {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Confirmar e Reenviar E-mail
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Gerar Cobros Confirmation Dialog */}
      <Dialog open={cobroConfirmFatura !== null} onOpenChange={(open) => !open && setCobroConfirmFatura(null)}>
        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800">
          {(() => {
            if (!cobroConfirmFatura) return null;

            const subtotal = Number(cobroConfirmFatura.total_valor || 0);
            const ivaAmount = cobroApplyIva ? subtotal * (cobroIvaPct / 100) : 0;
            const finalTotal = subtotal + ivaAmount;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-emerald-700">
                    <FileText className="w-6 h-6 text-emerald-600" />
                    Gerar Cobrança (Cobros)
                  </DialogTitle>
                  <DialogDescription className="text-sm pt-1">
                    Confirme os dados financeiros e defina a data de vencimento final para esta cobrança.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
                  {/* Opção de IVA */}
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cobroApplyIva}
                        onChange={(e) => setCobroApplyIva(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-605 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Destacar / Acrescentar IVA</span>
                    </label>
                    {cobroApplyIva && (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={cobroIvaPct}
                          onChange={(e) => setCobroIvaPct(Number(e.target.value))}
                          className="w-14 h-7 text-center text-xs p-1 font-bold dark:bg-slate-900 dark:border-slate-800"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    )}
                  </div>

                  {cobroConfirmFatura.client?.viesApplicable && (
                    <div className={`p-3.5 rounded-xl border flex gap-2.5 text-xs font-semibold ${
                      cobroConfirmFatura.client.viesValid
                        ? 'bg-emerald-50/50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/40'
                        : 'bg-rose-50/50 text-rose-800 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40 animate-pulse'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${cobroConfirmFatura.client.viesValid ? 'text-emerald-600' : 'text-rose-600'}`} />
                      <div className="leading-relaxed font-normal text-left">
                        <span className="font-extrabold block text-[11px] uppercase tracking-wider mb-0.5">
                          Cadastro VIES: {cobroConfirmFatura.client.viesValid ? 'Válido / Ativo' : 'BLOQUEADO / INVÁLIDO'}
                        </span>
                        {cobroConfirmFatura.client.viesValid ? (
                          <span>O cliente possui registro de IVA comunitário ativo. A isenção de IVA (taxa de 0%) é aplicável.</span>
                        ) : (
                          <span>Este faturamento está bloqueado porque o NIF/IVA do cliente está inválido ou pendente no VIES. Corrija o cadastro ou realize a consulta no Master Data antes de prosseguir.</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Detalhes do Faturamento */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider">Cliente</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {cobroConfirmFatura.client?.nombre_comercial}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Documento</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        FAT-{cobroConfirmFatura.id.substring(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Prazo Padrão</span>
                      <span className="text-slate-650 dark:text-slate-400 font-bold">
                        {cobroConfirmFatura.client?.paymentTermName || '30 dias'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Subtotal (Base)</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        € {subtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>IVA {cobroApplyIva ? `(${cobroIvaPct}%)` : ''}</span>
                      <span className="font-mono">
                        € {ivaAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t dark:border-slate-800 text-sm">
                      <span className="font-extrabold text-slate-850 dark:text-slate-200">
                        {cobroApplyIva ? 'Valor Total com IVA' : 'Valor Total (Sem IVA)'}
                      </span>
                      <span className={`font-mono font-extrabold ${cobroApplyIva ? 'text-emerald-600 dark:text-emerald-450 text-base' : 'text-slate-900 dark:text-white'}`}>
                        € {finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Vencimento */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Data de Vencimento
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={cobroDueDate}
                        onChange={(e) => setCobroDueDate(e.target.value)}
                        className="h-10 text-xs font-bold w-full dark:bg-slate-950 dark:border-slate-800"
                      />
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                      Nota: O vencimento calculado pelo prazo do cliente é{' '}
                      <span className="font-bold">
                        {(() => {
                          const termDays = cobroConfirmFatura.client?.paymentTermDays || 30;
                          const emissionDate = cobroConfirmFatura.data_emissao ? new Date(cobroConfirmFatura.data_emissao) : new Date();
                          const dueDate = new Date(emissionDate);
                          dueDate.setDate(dueDate.getDate() + termDays);
                          return dueDate.toLocaleDateString('pt-PT');
                        })()}
                      </span>
                      . Se desejar, ajuste para uma data futura acima.
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t dark:border-slate-800 pt-4 mt-2">
                  <Button variant="outline" onClick={() => setCobroConfirmFatura(null)} disabled={isGeneratingCobro}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => handleConfirmGerarCobro()}
                    disabled={isGeneratingCobro || !cobroDueDate || (cobroConfirmFatura.client?.viesApplicable && !cobroConfirmFatura.client?.viesValid)}
                    className={`text-white border-none ${
                      cobroConfirmFatura.client?.viesApplicable && !cobroConfirmFatura.client?.viesValid
                        ? 'bg-slate-350 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isGeneratingCobro ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Confirmar e Gerar Cobrança
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
