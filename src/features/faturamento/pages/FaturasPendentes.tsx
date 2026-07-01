import React, { useEffect, useState } from 'react';
import { supabase } from '@/shared/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  getHorasPendentesFaturamento, 
  solicitarAprovacaoCliente, 
  atualizarHorasDiarias, 
  atualizarTarifaFaturada 
} from '../api/faturamentoApi';
import type { ClientBillingSummary } from '../api/faturamentoApi';
import { toast } from 'sonner';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Link as LinkIcon, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Users, 
  FileText, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  Edit2,
  Copy,
  AlertTriangle,
  StickyNote,
  Mail,
  FileSpreadsheet,
  Send,
  Check,
  Search,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresa } from '../../../app/providers/EmpresaProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function FaturasPendentes() {
  const [faturamentos, setFaturamentos] = useState<ClientBillingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedObraByClient, setSelectedObraByClient] = useState<Record<string, string | null>>({});
  const [processingClient, setProcessingClient] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedWorkers, setExpandedWorkers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedEmpresaId } = useEmpresa();

  const [clientActiveTabs, setClientActiveTabs] = useState<Record<string, 'edicao' | 'datas_trabalhadas' | 'importe' | 'informe' | 'factura'>>({});

  interface ClientAdjustments {
    incrementos: number;
    incrementosDesc: string;
    reducoes: number;
    reducoesDesc: string;
    ivaPct: number;
    iban: string;
    dataEmissao: string;
    dataVencimento: string;
    condicoesPagamento: string;
    descricaoServico: string;
  }
  const [clientAdjustments, setClientAdjustments] = useState<Record<string, ClientAdjustments>>({});

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState<{
    clientId: string;
    clientName: string;
    recipientEmail: string;
    subject: string;
    body: string;
    horasIds: string[];
    token: string;
  } | null>(null);

  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [sendEmailCheckbox, setSendEmailCheckbox] = useState(true);

  const getMonthName = (mIndex: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[mIndex] || '';
  };

  const initAdjustments = (f: ClientBillingSummary) => {
    const condPay = f.paymentTermName || 'Pronto Pagamento';
    const payDays = f.paymentTermDays ?? 0;
    
    const emissionDate = new Date();
    const emissionStr = emissionDate.toISOString().split('T')[0];
    
    const dueDate = new Date();
    dueDate.setDate(emissionDate.getDate() + payDays);
    const dueStr = dueDate.toISOString().split('T')[0];

    const defaultIban = "NIB: PT50 0018 000365089609020 15\nBanco Santander\nSWIFT: TOTAPPTPL";
    const defaultDesc = `Prestação de Serviços - ${getMonthName(f.month)} ${f.year} - Obra: Sin Obra`;

    return {
      incrementos: f.ajustesJson?.incrementos ?? 0,
      incrementosDesc: f.ajustesJson?.incrementos_desc ?? '',
      reducoes: f.ajustesJson?.reducoes ?? 0,
      reducoesDesc: f.ajustesJson?.reducoes_desc ?? '',
      ivaPct: f.ajustesJson?.iva_pct ?? 0,
      iban: f.ajustesJson?.iban ?? defaultIban,
      dataEmissao: f.dataEmissaoFatura || f.ajustesJson?.dataEmissao || emissionStr,
      dataVencimento: f.ajustesJson?.data_vencimento || dueStr,
      condicoesPagamento: f.ajustesJson?.condicoes_pagamento || condPay,
      descricaoServico: f.ajustesJson?.descricao_servico || defaultDesc,
    };
  };

  const getActiveTab = (clientId: string) => clientActiveTabs[clientId] || 'edicao';
  const setActiveTab = (clientId: string, tab: 'edicao' | 'datas_trabalhadas' | 'importe' | 'informe' | 'factura') => {
    setClientActiveTabs(prev => ({ ...prev, [clientId]: tab }));
  };

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('month');
    if (m) return parseInt(m) - 1;

    try {
      const stored = localStorage.getItem('mcs:selectedPeriod');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.year && parsed.month) {
          return parsed.month - 1;
        }
      }
    } catch (e) {
      console.error("Error reading stored period in FaturasPendentes", e);
    }

    // Default fallback to previous month
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    return prevMonthDate.getMonth();
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const y = params.get('year');
    if (y) return parseInt(y);

    try {
      const stored = localStorage.getItem('mcs:selectedPeriod');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.year && parsed.month) {
          return parsed.year;
        }
      }
    } catch (e) {
      console.error("Error reading stored period in FaturasPendentes", e);
    }

    // Default fallback to previous month
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    return prevMonthDate.getFullYear();
  });

  // Sync selectors to page URL and localStorage
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('year', selectedYear.toString());
    url.searchParams.set('month', (selectedMonth + 1).toString());
    window.history.replaceState({}, '', url.pathname + url.search);

    // Save to localStorage as 1-indexed month
    localStorage.setItem('mcs:selectedPeriod', JSON.stringify({ year: selectedYear, month: selectedMonth + 1 }));
  }, [selectedYear, selectedMonth]);

  // Tariff modal states
  const [isTariffDialogOpen, setIsTariffDialogOpen] = useState(false);
  const [selectedTariffData, setSelectedTariffData] = useState<{
    workerId: string;
    workerName: string;
    clientId: string;
    clientName: string;
    currentTariff: number;
    year: number;
    month: number;
  } | null>(null);
  const [newTariffValue, setNewTariffValue] = useState('');
  const [updatingTariff, setUpdatingTariff] = useState(false);
  const [selectedPaymentTermFilter, setSelectedPaymentTermFilter] = useState<string>('all');

  const fetchHoras = async () => {
    try {
      setLoading(true);
      const data = await getHorasPendentesFaturamento(selectedEmpresaId, selectedYear, selectedMonth + 1);
      setFaturamentos(data);

      // Initialize adjustments state
      const initialAdjustments: Record<string, ClientAdjustments> = {};
      data.forEach(f => {
        initialAdjustments[f.clientId] = initAdjustments(f);
      });
      setClientAdjustments(initialAdjustments);
    } catch (error: any) {
      toast.error('Erro ao carregar faturamentos', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoras();
  }, [selectedEmpresaId, selectedYear, selectedMonth]);

  const handleSolicitarAprovacao = (clientId: string, workers: any[]) => {
    const selectedObraId = selectedObraByClient[clientId];
    const faturamento = faturamentos.find(f => f.clientId === clientId);
    if (!faturamento) return;

    const selectedObra = selectedObraId !== undefined
      ? faturamento.obras.find(o => o.id === selectedObraId)
      : null;

    const horasIds: string[] = [];
    workers.forEach(w => {
      Object.values(w.horasDiarias).forEach((h: any) => {
        if (h && h.id && h.status !== 'pending_client_approval' && h.status !== 'approved' && h.status !== 'disputed' && h.status !== 'invoiced') {
          horasIds.push(h.id);
        }
      });
    });

    if (horasIds.length === 0) {
      toast.error('Nenhuma hora pendente para faturamento neste cliente.');
      return;
    }

    const adj = clientAdjustments[clientId] || initAdjustments(faturamento);
    const totalBase = selectedObra ? selectedObra.totalValor : faturamento.totalValor;
    const finalTotal = (totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);

    const periodStr = `${getMonthName(faturamento.month)} de ${faturamento.year}`;
    const obraSuffix = selectedObra ? ` - Obra: ${selectedObra.name}` : '';
    const subject = `MCS - Solicitação de Aprovação de Horas - ${faturamento.clientName}${obraSuffix} - ${periodStr}`;
    
    const previewToken = crypto.randomUUID(); 
    const link = `${window.location.origin}/aprovacao-cliente/${previewToken}`;
    
    const body = `Olá,

Gostaríamos de solicitar a sua aprovação para o relatório de faturamento referente ao período de ${periodStr}${selectedObra ? ` (Obra: ${selectedObra.name})` : ''}.

Em anexo, você encontrará os seguintes documentos para a sua análise:
1. Informe de Facturación (IF-${faturamento.year}/0760)${selectedObra ? ` - ref. Obra: ${selectedObra.name}` : ''}
2. Folha de ponto detalhada com as datas trabalhadas
3. Fatura Pró-forma correspondente no valor de € ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Por favor, utilize o link abaixo para visualizar os documentos de forma interativa e aprovar ou contestar as horas:
${link}

Se tiver alguma dúvida, entre em contato respondendo a este e-mail.

Atenciosamente,
MCS - Gestão Comercial`;

    const defaultEmails: string[] = [];
    if (faturamento.billingEmail) {
      defaultEmails.push(faturamento.billingEmail);
    } else if (faturamento.clientEmail) {
      defaultEmails.push(faturamento.clientEmail);
    }
    
    // Check some operations emails by default
    defaultEmails.push("valter@kr-industrial.com");
    defaultEmails.push("valter@gestaologinpro.com");

    setSelectedEmails(defaultEmails);
    setAdditionalEmails("");
    setSendEmailCheckbox(true);

    setEmailData({
      clientId,
      clientName: faturamento.clientName,
      recipientEmail: defaultEmails.join(", "),
      subject,
      body,
      horasIds,
      token: previewToken
    });
    setIsEmailModalOpen(true);
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
      
      const faturamento = faturamentos.find(f => f.clientId === emailData.clientId);
      if (!faturamento) return;

      const adj = clientAdjustments[emailData.clientId] || initAdjustments(faturamento);

      const selectedObraId = selectedObraByClient[emailData.clientId];
      const selectedObra = selectedObraId !== undefined
        ? faturamento.obras.find(o => o.id === selectedObraId)
        : null;

      // Save adjustments to the DB by calling solicitarAprovacaoCliente
      await solicitarAprovacaoCliente(
        emailData.clientId,
        emailData.horasIds,
        {
          incrementos: Number(adj.incrementos || 0),
          incrementos_desc: adj.incrementosDesc || '',
          reducoes: Number(adj.reducoes || 0),
          reducoes_desc: adj.reducoesDesc || '',
          iva_pct: Number(adj.ivaPct || 0),
          iban: adj.iban,
          data_emissao: adj.dataEmissao,
          data_vencimento: adj.dataVencimento,
          condicoes_pagamento: adj.condicoesPagamento,
          descricao_servico: adj.descricaoServico,
          obra: selectedObra ? selectedObra.name : null
        },
        emailData.token
      );

      // Detectar URL e converter em um link HTML clicável
      const linkRegex = /(https?:\/\/[^\s]+)/g;
      const htmlBody = emailData.body
        .replace(linkRegex, (url) => `<a href="${url}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${url}</a>`)
        .replace(/\n/g, '<br/>');

      // Disparar e-mail real utilizando a Edge Function de notificação existente
      const { error: functionErr } = await supabase.functions.invoke('send-order-notification', {
        body: {
          empresa_id: selectedEmpresaId,
          to_emails: toEmails,
          email_subject: emailData.subject,
          email_body: htmlBody,
          is_faturamento: true,
          fatura_code: "FAT-" + emailData.token.substring(0, 8).toUpperCase(),
          client_name: emailData.clientName
        }
      });

      if (functionErr) {
        console.error('Error invoking send-order-notification for billing:', functionErr);
        toast.warning('Ajustes salvos no faturamento, mas falhou ao enviar o e-mail de aprovação.', {
          description: functionErr.message
        });
      } else {
        toast.success(`E-mail com portal de aprovação enviado com sucesso para ${toEmails.join(', ')}!`);
      }

      setIsEmailModalOpen(false);
      fetchHoras();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao solicitar aprovação: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const toggleWorker = (clientId: string, workerId: string) => {
    const key = `${clientId}-${workerId}`;
    setExpandedWorkers(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Helpers
  const formatPeriodo = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getOnlyDateStr = (dateVal: string) => {
    if (!dateVal) return '';
    if (dateVal.includes('T')) {
      return dateVal.split('T')[0];
    }
    return dateVal;
  };

  const getDayLabel = (d: number, month: number) => {
    const monthShorts = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${String(d).padStart(2, '0')}-${monthShorts[month]}`;
  };

  const handleInputBlur = async (
    e: React.FocusEvent<HTMLInputElement>,
    worker: any,
    targetDateStr: string,
    record: any,
    clientId: string
  ) => {
    const newValStr = e.target.value.trim();
    if (newValStr === '') return;
    const newVal = parseFloat(newValStr);
    const oldVal = record ? Number(record.horas_totais) : 0;

    if (isNaN(newVal) || newVal < 0) {
      toast.error('Por favor, insira um número válido de horas.');
      e.target.value = oldVal.toString();
      return;
    }

    if (newVal === oldVal) return; // Sem alteração

    try {
      toast.loading('Salvando alterações...', { id: 'saving_hours' });
      await atualizarHorasDiarias(
        record?.id || '',
        newVal,
        worker.workerId,
        clientId,
        targetDateStr,
        worker.funcaoId,
        worker.tarifa
      );
      toast.success('Horas atualizadas com sucesso!', { id: 'saving_hours' });
      await fetchHoras();
    } catch (err: any) {
      toast.error('Erro ao salvar horas', { id: 'saving_hours', description: err.message });
      e.target.value = oldVal.toString(); // Reverte
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleOpenTariffDialog = (worker: any, clientId: string, clientName: string, year: number, month: number) => {
    setSelectedTariffData({
      workerId: worker.workerId,
      workerName: worker.workerName,
      clientId,
      clientName,
      currentTariff: worker.tarifa,
      year,
      month
    });
    setNewTariffValue(worker.tarifa.toString());
    setIsTariffDialogOpen(true);
  };

  const handleSaveTariff = async () => {
    if (!selectedTariffData) return;
    const newVal = parseFloat(newTariffValue);
    if (isNaN(newVal) || newVal < 0) {
      toast.error('Por favor, insira um valor de tarifa válido.');
      return;
    }

    try {
      setUpdatingTariff(true);
      toast.loading('Atualizando tarifas...', { id: 'updating_tariff' });
      await atualizarTarifaFaturada(
        selectedTariffData.workerId,
        selectedTariffData.clientId,
        selectedTariffData.year,
        selectedTariffData.month + 1, // Converte para 1-indexed
        newVal
      );
      toast.success('Tarifas atualizadas com sucesso!', { id: 'updating_tariff' });
      setIsTariffDialogOpen(false);
      await fetchHoras();
    } catch (err: any) {
      toast.error('Erro ao atualizar tarifas', { id: 'updating_tariff', description: err.message });
    } finally {
      setUpdatingTariff(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Filtrar faturamentos por prazo de pagamento e busca de cliente
  const filteredFaturamentos = faturamentos.filter(f => {
    // Aplicar filtro de busca textual por cliente (nome ou código)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const clientName = (f.clientName || '').toLowerCase();
      const clientCode = (f.clientCode || '').toLowerCase();
      if (!clientName.includes(query) && !clientCode.includes(query)) {
        return false;
      }
    }

    if (selectedPaymentTermFilter === 'all') return true;
    if (selectedPaymentTermFilter === 'priority') {
      return f.paymentTermDays !== null && f.paymentTermDays <= 15;
    }
    if (selectedPaymentTermFilter === 'other') {
      return f.paymentTermDays === null || (f.paymentTermDays !== 0 && f.paymentTermDays !== 10 && f.paymentTermDays !== 15 && f.paymentTermDays !== 30 && f.paymentTermDays !== 60);
    }
    const daysVal = parseInt(selectedPaymentTermFilter);
    return f.paymentTermDays === daysVal;
  });

  // Resumos do Topo
  const totalHorasPendentes = faturamentos.reduce((acc, f) => acc + f.totalHoras, 0);
  const totalClientes = faturamentos.length;
  
  let horasBaixaConfianca = 0;
  faturamentos.forEach(f => {
    f.workers.forEach(w => {
      Object.values(w.horasDiarias).forEach((h: any) => {
        if (h && h.extraction_confidence !== null && h.extraction_confidence < 95) {
          horasBaixaConfianca++;
        }
      });
    });
  });

  // Cálculos de clientes prioritários (prazo <= 15 dias)
  const prioritariosCount = faturamentos.filter(f => f.paymentTermDays !== null && f.paymentTermDays <= 15).length;
  const prioritariosValor = faturamentos
    .filter(f => f.paymentTermDays !== null && f.paymentTermDays <= 15)
    .reduce((acc, f) => acc + f.totalValor, 0);

  const getBillingStatusBadge = (status: ClientBillingSummary['statusBilling'], validated: number, total: number) => {
    switch (status) {
      case 'waiting_validation':
        const pct = total > 0 ? Math.round((validated / total) * 100) : 0;
        return (
          <div className="flex flex-col gap-1.5 mt-0.5">
            <Badge variant="outline" className="bg-amber-50/50 text-amber-800 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 flex w-max items-center gap-1.5 font-medium py-1 px-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Coleta de Horas ({validated}/{total})
            </Badge>
            <div className="flex items-center gap-2 w-32 md:w-36">
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-700/40">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">{pct}%</span>
            </div>
          </div>
        );
      case 'ready':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 flex w-max items-center gap-1.5 font-medium py-1 px-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            Pendente Faturamento
          </Badge>
        );
      case 'invoiced_pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 flex w-max items-center gap-1.5 font-medium py-1 px-2.5">
            <Clock className="w-3.5 h-3.5" />
            Aguardando Cliente
          </Badge>
        );
      case 'invoiced_approved':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 flex w-max items-center gap-1.5 font-medium py-1 px-2.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aprovado
          </Badge>
        );
      case 'invoiced_disputed':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 flex w-max items-center gap-1.5 font-medium py-1 px-2.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Contestado
          </Badge>
        );
    }
  };

  const handleCopyLink = (token: string | null) => {
    if (!token) {
      toast.error('Token de link mágico indisponível.');
      return;
    }
    const magicLink = `${window.location.origin}/aprovacao-cliente/${token}`;
    navigator.clipboard.writeText(magicLink);
    toast.success('Link copiado para a área de transferência!');
  };

  return (
    <div className="p-4 md:p-5 space-y-6 max-w-full w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Operacional de Faturamento</h1>
          <p className="text-muted-foreground mt-1">
            Revise as horas validadas e solicite a aprovação dos faturamentos.
          </p>
        </div>
      </div>

      {/* Seletor de Período */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mês Referência</span>
            <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
              <SelectTrigger className="w-[180px] bg-slate-50 dark:bg-slate-950 font-medium">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Janeiro</SelectItem>
                <SelectItem value="1">Fevereiro</SelectItem>
                <SelectItem value="2">Março</SelectItem>
                <SelectItem value="3">Abril</SelectItem>
                <SelectItem value="4">Maio</SelectItem>
                <SelectItem value="5">Junho</SelectItem>
                <SelectItem value="6">Julho</SelectItem>
                <SelectItem value="7">Agosto</SelectItem>
                <SelectItem value="8">Setembro</SelectItem>
                <SelectItem value="9">Outubro</SelectItem>
                <SelectItem value="10">Novembro</SelectItem>
                <SelectItem value="11">Dezembro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ano</span>
            <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
              <SelectTrigger className="w-[120px] bg-slate-50 dark:bg-slate-950 font-medium">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Prazo de Pagamento</span>
            <Select value={selectedPaymentTermFilter} onValueChange={setSelectedPaymentTermFilter}>
              <SelectTrigger className="w-[210px] bg-slate-50 dark:bg-slate-950 font-medium">
                <SelectValue placeholder="Filtrar por prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Prazos</SelectItem>
                <SelectItem value="priority">Prioritários (até 15 dias)</SelectItem>
                <SelectItem value="0">Pronto Pagamento</SelectItem>
                <SelectItem value="10">10 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="other">Outros / Não Definidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Buscar Cliente</span>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 w-[240px] bg-slate-50 dark:bg-slate-950 font-medium h-9 text-xs dark:border-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 h-5 w-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total de Horas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalHorasPendentes.toFixed(2)}h</div>
            <p className="text-xs text-muted-foreground">Validadas e prontas no período</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalClientes}</div>
            <p className="text-xs text-muted-foreground">Com atividades registradas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Caixa Rápido (≤ 15d)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
              {prioritariosCount} {prioritariosCount === 1 ? 'Cliente' : 'Clientes'}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valor: <span className="font-bold text-slate-700 dark:text-slate-300">
                € {prioritariosValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Avisos OCR</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{horasBaixaConfianca}</div>
            <p className="text-xs text-muted-foreground">Registros com baixa confiança</p>
          </CardContent>
        </Card>
      </div>

      {filteredFaturamentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <CheckCircle2 className="h-12 w-12 text-slate-400 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {faturamentos.length === 0 
                ? "Nenhum cliente ativo encontrado para este período."
                : searchQuery.trim()
                  ? "Nenhum cliente atende aos termos da busca digitada."
                  : "Nenhum cliente atende aos filtros de prazo selecionados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFaturamentos.map(f => {
            const isProcessing = processingClient === f.clientId;
            const isExpanded = expandedClients[f.clientId];
            
            const numDays = new Date(f.year, f.month + 1, 0).getDate();
            const daysArray = Array.from({ length: numDays }, (_, i) => i + 1);

            const isBlocked = f.statusBilling === 'waiting_validation';
            const isAlreadyInvoiced = f.statusBilling.startsWith('invoiced');

            const selectedObraId = selectedObraByClient[f.clientId];
            const hasObraFilter = selectedObraId !== undefined;

            // Filter workers and their hours based on the selected Obra
            const filteredWorkers = f.workers.map(w => {
              const filteredHorasDiarias = Object.entries(w.horasDiarias).reduce((acc, [date, h]: [string, any]) => {
                if (!hasObraFilter || h.obra_id === selectedObraId) {
                  acc[date] = h;
                }
                return acc;
              }, {} as Record<string, any>);

              const wTotalHoras = Object.values(filteredHorasDiarias).reduce((sum, h: any) => sum + Number(h.horas_totais || 0), 0);
              const wTotalValor = Object.values(filteredHorasDiarias).reduce((sum, h: any) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

              return {
                ...w,
                horasDiarias: filteredHorasDiarias,
                totalHoras: wTotalHoras,
                totalValor: wTotalValor
              };
            }).filter(w => w.totalHoras > 0);

            const displayTotalHoras = hasObraFilter
              ? (f.obras.find(o => o.id === selectedObraId)?.totalHoras || 0)
              : f.totalHoras;

            const displayTotalValor = hasObraFilter
              ? (f.obras.find(o => o.id === selectedObraId)?.totalValor || 0)
              : f.totalValor;

            const selectedObra = hasObraFilter 
              ? f.obras.find(o => o.id === selectedObraId)
              : null;

            return (
              <Card 
                key={f.clientId} 
                className={`overflow-hidden shadow-sm transition-all hover:shadow-md border border-slate-200 dark:border-slate-800 ${
                  isBlocked ? 'opacity-85 bg-slate-50/70 dark:bg-slate-900/10 border-dashed' : ''
                }`}
              >
                {/* Cabeçalho do Cartão (Colunas Estilizadas) */}
                <div 
                  className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => toggleClient(f.clientId)}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full lg:flex-1 items-center">
                    
                    {/* Coluna 1: Cliente e Empresa */}
                    <div className="flex items-center gap-3 sm:col-span-2">
                      <div className={`p-2.5 rounded-lg shrink-0 ${
                        isBlocked ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {f.clientCodigo && (
                            <span className="text-slate-400 font-normal bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] shrink-0">
                              {f.clientCodigo}
                            </span>
                          )}
                          <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 truncate">{f.clientName}</h3>
                          {f.paymentTermDays !== null && f.paymentTermDays <= 15 && (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-[9px] font-extrabold px-1.5 py-0 shadow-[0_0_8px_rgba(16,185,129,0.3)] shrink-0">
                              Prioridade
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium shrink-0">
                            <Briefcase size={12} /> {f.empresaNome}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700 text-xs shrink-0">•</span>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold shrink-0 ${
                            f.paymentTermDays !== null && f.paymentTermDays <= 15
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}>
                            <Calendar size={12} /> Prazo: {f.paymentTermName || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2: Status */}
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Status</p>
                        {getBillingStatusBadge(f.statusBilling, f.validatedWorkers, f.totalWorkers)}
                      </div>
                    </div>

                    {/* Coluna 3: Total Horas */}
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400 shrink-0" />
                      <div className="text-sm">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Horas Validadas</p>
                        <p className={`font-bold ${isBlocked ? 'text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                          {f.totalHoras.toFixed(2)}h
                        </p>
                      </div>
                    </div>

                    {/* Coluna 4: Faturamento */}
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className={isBlocked ? 'text-slate-400' : 'text-emerald-500'} />
                      <div className="text-sm">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Faturamento</p>
                        <p className={`font-bold ${isBlocked ? 'text-slate-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                          € {f.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    {/* Ações baseadas no status */}
                    {isBlocked ? (
                      <Button 
                        disabled
                        variant="secondary"
                        size="sm"
                        className="bg-slate-100 text-slate-400 cursor-not-allowed font-medium shrink-0"
                      >
                        Aguardando Validação
                      </Button>
                    ) : f.statusBilling === 'ready' ? (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSolicitarAprovacao(f.clientId, filteredWorkers);
                        }}
                        disabled={isProcessing}
                        variant="default"
                        size="sm"
                        className="shadow-sm bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5 shrink-0"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LinkIcon size={14} />
                        )}
                        Solicitar Aprovação
                      </Button>
                    ) : f.statusBilling === 'invoiced_pending' ? (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(f.magicLinkToken);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-50 font-medium gap-1.5 shrink-0 dark:bg-amber-950/20 dark:text-amber-400"
                      >
                        <Copy size={14} />
                        Copiar Link
                      </Button>
                    ) : (
                      <Button 
                        disabled
                        variant="outline"
                        size="sm"
                        className="font-medium shrink-0"
                      >
                        Faturamento Concluído
                      </Button>
                    )}
                    <div className="text-slate-400 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors shrink-0">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* Área Expandida (Trabalhadores e Horas Diárias com Abas) */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 text-left">
                    {/* Obras Filter Cards */}
                    {f.obras && f.obras.some(o => o.id !== null) && (
                      <div className="p-5 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Filtrar e Faturar por Obra / Centro de Custo</span>
                        <div className="flex flex-wrap gap-3">
                          {/* Card "Todas as Obras" */}
                          <div 
                            onClick={() => setSelectedObraByClient(prev => {
                              const next = { ...prev };
                              delete next[f.clientId];
                              return next;
                            })}
                            className={`flex-1 min-w-[150px] max-w-[240px] p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] flex items-center justify-between gap-3 ${
                              selectedObraByClient[f.clientId] === undefined
                                ? 'bg-white border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30 shadow-xs'
                                : 'bg-slate-50/50 border-slate-200 hover:bg-white dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Todas as Obras</span>
                              <span className="text-xs text-slate-400 mt-0.5">{f.totalHoras.toFixed(2)} hrs</span>
                            </div>
                            <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              € {f.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Cards for each Obra */}
                          {f.obras.map((obra) => {
                            const isSelected = selectedObraByClient[f.clientId] === obra.id;
                            return (
                              <div 
                                key={obra.id || 'sem_obra'}
                                onClick={() => setSelectedObraByClient(prev => ({ ...prev, [f.clientId]: obra.id }))}
                                className={`flex-1 min-w-[150px] max-w-[240px] p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] flex items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-white border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30 shadow-xs'
                                    : 'bg-slate-50/50 border-slate-200 hover:bg-white dark:border-slate-800'
                                }`}
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={obra.name}>
                                    {obra.name}
                                  </span>
                                  <span className="text-xs text-slate-400 mt-0.5">{obra.totalHoras.toFixed(2)} hrs</span>
                                </div>
                                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 shrink-0">
                                  € {obra.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 gap-2 text-xs font-semibold">
                      <button 
                        onClick={() => setActiveTab(f.clientId, 'edicao')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(f.clientId) === 'edicao' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Edição dos dados
                      </button>
                      <button 
                        onClick={() => setActiveTab(f.clientId, 'datas_trabalhadas')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(f.clientId) === 'datas_trabalhadas' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Datas trabalhadas
                      </button>
                      <button 
                        onClick={() => setActiveTab(f.clientId, 'importe')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(f.clientId) === 'importe' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Importe
                      </button>
                      <button 
                        onClick={() => setActiveTab(f.clientId, 'informe')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(f.clientId) === 'informe' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Informe
                      </button>
                      <button 
                        onClick={() => setActiveTab(f.clientId, 'factura')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(f.clientId) === 'factura' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Factura Única
                      </button>
                    </div>

                    {/* Aba 1: Edição dos dados */}
                    {getActiveTab(f.clientId) === 'edicao' && (
                      <Table>
                        <TableHeader className="bg-slate-100/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead className="pl-4">Cod.</TableHead>
                            <TableHead>Trabajador</TableHead>
                            <TableHead>Perfil</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead className="text-right">Qtd Hrs</TableHead>
                            <TableHead className="text-right">Tarifa</TableHead>
                            <TableHead className="text-right pr-6">Total €</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredWorkers.map(worker => {
                            const workerKey = `${f.clientId}-${worker.workerId}`;
                            const isWorkerExpanded = expandedWorkers[workerKey];

                            return (
                              <React.Fragment key={worker.workerId}>
                                {/* Linha do Trabalhador */}
                                <TableRow 
                                  className={`cursor-pointer hover:bg-slate-100/30 dark:hover:bg-slate-800/20 border-slate-100 dark:border-slate-800 transition-colors ${
                                    !worker.isValidated ? 'text-slate-400/80 bg-slate-50/20 dark:bg-slate-900/5' : ''
                                  }`}
                                  onClick={() => toggleWorker(f.clientId, worker.workerId)}
                                >
                                  <TableCell className="text-center p-2 align-top pt-4">
                                    {isWorkerExpanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs text-slate-500 pl-4 align-top pt-4">{worker.codColab}</TableCell>
                                  <TableCell className="align-top pt-4">
                                    <div className="flex flex-col gap-1.5">
                                      <span className={`font-semibold ${worker.isValidated ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                                        {worker.workerName}
                                      </span>
                                      {/* Exibição do Status do Trabalhador */}
                                      {(() => {
                                        const rawStatus = worker.workerStatus?.toUpperCase() || '';
                                        let displayStatus = rawStatus;
                                        let isHistoricalActive = false;
                                        
                                        if ((rawStatus === 'INATIVO' || rawStatus === 'BAIXA') && worker.dataBaixa) {
                                          const baixaDate = new Date(worker.dataBaixa + 'T00:00:00');
                                          if (baixaDate.getFullYear() > selectedYear || (baixaDate.getFullYear() === selectedYear && baixaDate.getMonth() > selectedMonth)) {
                                            displayStatus = 'ATIVO';
                                            isHistoricalActive = true;
                                          }
                                        }

                                        if (displayStatus === 'INATIVO' || displayStatus === 'BAIXA') {
                                          return (
                                            <Badge variant="destructive" className="w-fit text-[9px] px-1.5 py-0 h-4.5 font-bold">
                                              Inativo {worker.dataBaixa ? `em ${new Date(worker.dataBaixa + 'T00:00:00').toLocaleDateString('pt-PT')}` : ''}
                                            </Badge>
                                          );
                                        } else if (displayStatus === 'ATIVO') {
                                          return (
                                            <Badge variant="outline" className="w-fit text-[9px] px-1.5 py-0 h-4.5 font-bold text-green-600 border-green-200 bg-green-50" title={isHistoricalActive ? "Trabalhador inativado posteriormente" : undefined}>
                                              {isHistoricalActive ? 'Ativo' : worker.workerStatus || 'Ativo'}
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}

                                      {/* Exibição das Anotações / Observações */}
                                      {worker.observacoes && (
                                        <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/50 dark:border-slate-700/50 w-fit max-w-[280px]" title="Anotação do Controle de Horas">
                                          <StickyNote className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="truncate">{worker.observacoes}</span>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-slate-500 dark:text-slate-400 text-sm align-top pt-4">{worker.perfil}</TableCell>
                                  
                                  <TableCell className="text-right align-top pt-4">
                                    {worker.isValidated ? (
                                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium py-0.5">
                                        Validado
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-medium py-0.5">
                                        Aguardando
                                      </Badge>
                                    )}
                                  </TableCell>

                                  <TableCell className="text-right font-bold text-slate-800 dark:text-slate-200 align-top pt-4">
                                    {worker.isValidated ? `${worker.totalHoras.toFixed(2)}h` : '--'}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold align-top pt-4">
                                    {worker.isValidated ? (
                                      <div className="flex items-center justify-end gap-1.5 group/tarifa">
                                        <span>€ {worker.tarifa.toFixed(2)}</span>
                                        {!isAlreadyInvoiced && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenTariffDialog(worker, f.clientId, f.clientName, f.year, f.month);
                                            }}
                                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover/tarifa:opacity-100 transition-all"
                                            title="Editar Tarifa"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-400">--</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right pr-6 font-bold text-emerald-600 dark:text-emerald-500 align-top pt-4">
                                    {worker.isValidated ? `€ ${worker.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
                                  </TableCell>
                                </TableRow>

                                {/* Linha Sub-Expandida (Calendário Horizontal) */}
                                {isWorkerExpanded && (
                                  <TableRow className="bg-white dark:bg-slate-950/40 hover:bg-transparent">
                                    <TableCell colSpan={8} className="p-2 md:p-4 border-slate-100 dark:border-slate-800">
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Horas Diárias</span>
                                          {!worker.isValidated && (
                                            <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                                              As horas deste colaborador precisam ser validadas no painel de Controle de Horas para habilitar a edição.
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Contêiner de rolagem horizontal */}
                                        <div className="flex gap-1 md:gap-1.5 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                                          {daysArray.map(d => {
                                            const targetDateStr = `${f.year}-${String(f.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                            const record = worker.horasDiarias[targetDateStr];
                                            const hoursVal = record ? Number(record.horas_totais) : 0;
                                            
                                            const date = new Date(f.year, f.month, d);
                                            const dayOfWeek = date.getDay();
                                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                            const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                                            const weekdayLabel = weekdays[dayOfWeek];

                                            return (
                                              <div 
                                                key={d} 
                                                className={`flex-1 flex flex-col items-center p-1.5 rounded-md min-w-[38px] max-w-[50px] transition-colors ${
                                                  isWeekend 
                                                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40' 
                                                    : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                                                }`}
                                              >
                                                <span className={`text-[10px] md:text-xs font-extrabold leading-none mb-1 ${isWeekend ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                  {String(d).padStart(2, '0')}
                                                </span>
                                                <span className={`text-[8px] md:text-[9.5px] font-bold leading-normal mb-1.5 ${isWeekend ? 'text-amber-500/70' : 'text-slate-400/70'}`}>
                                                  {weekdayLabel}
                                                </span>
                                                <input
                                                  type="text"
                                                  disabled={!worker.isValidated || isAlreadyInvoiced}
                                                  defaultValue={hoursVal === 0 ? '0' : hoursVal.toString()}
                                                  onKeyDown={handleInputKeyDown}
                                                  onBlur={(e) => handleInputBlur(e, worker, targetDateStr, record, f.clientId)}
                                                  className="w-8 h-6 text-center text-xs font-bold rounded border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-0 disabled:opacity-50 disabled:bg-slate-100/50 dark:disabled:bg-slate-900"
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}

                    {/* Aba 2: Datas trabalhadas */}
                    {getActiveTab(f.clientId) === 'datas_trabalhadas' && (
                      <div className="p-6 bg-white dark:bg-slate-950 overflow-x-auto">
                        <div className="mb-6 flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Relatório de Horas</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">Cliente: <span className="font-semibold">{f.clientName}</span> | Período: <span className="font-semibold">{getMonthName(f.month)} / {f.year}</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground font-semibold">Total de Horas: <span className="text-slate-900 dark:text-slate-100 font-bold">{displayTotalHoras.toFixed(2)}h</span></p>
                            <p className="text-xs text-muted-foreground font-semibold">Faturamento Base: <span className="text-slate-900 dark:text-slate-100 font-bold">€ {displayTotalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span></p>
                          </div>
                        </div>

                        <div className="text-center font-bold text-sm tracking-wider bg-slate-100 dark:bg-slate-900 py-1.5 text-slate-700 dark:text-slate-300 rounded mb-4">
                          OBRA: {selectedObra ? selectedObra.name.toUpperCase() : 'TODAS AS OBRAS'}
                        </div>

                        <Table className="border border-slate-200 dark:border-slate-800 rounded-lg">
                          <TableHeader className="bg-slate-50 dark:bg-slate-900">
                            <TableRow>
                              <TableHead className="font-bold text-xs pl-4">Trabalhador</TableHead>
                              {daysArray.map(day => (
                                <TableHead key={day} className="text-center font-bold text-[10px] p-1 min-w-[28px] max-w-[34px]">
                                  {String(day).padStart(2, '0')}
                                </TableHead>
                              ))}
                              <TableHead className="text-right font-bold text-xs pr-4">TOTAL</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredWorkers.map(worker => {
                              const workerTotal = Object.values(worker.horasDiarias).reduce((sum, h: any) => sum + Number(h?.horas_totais || 0), 0);
                              return (
                                <TableRow key={worker.workerId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                  <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200 pl-4 py-3">{worker.workerName}</TableCell>
                                  {daysArray.map(day => {
                                    const dateKey = `${f.year}-${String(f.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const hourObj = worker.horasDiarias[dateKey] as any;
                                    const hoursVal = hourObj ? Number(hourObj.horas_totais || 0) : 0;
                                    return (
                                      <TableCell key={day} className={`text-center text-xs p-1 ${hoursVal > 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-300 dark:text-slate-700'}`}>
                                        {hoursVal > 0 ? hoursVal : '-'}
                                      </TableCell>
                                    );
                                  })}
                                  <TableCell className="text-right font-bold text-xs text-slate-900 dark:text-slate-100 pr-4 py-3">
                                    {workerTotal.toFixed(1)}h
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Aba 3: Importe */}
                    {getActiveTab(f.clientId) === 'importe' && (() => {
                      const adj = clientAdjustments[f.clientId] || initAdjustments(f);
                      const handleFieldChange = (field: keyof ClientAdjustments, val: any) => {
                        setClientAdjustments(prev => {
                          const current = prev[f.clientId] || initAdjustments(f);
                          const updated = { ...current, [field]: val };
                          
                          if (field === 'dataEmissao' || field === 'condicoesPagamento') {
                            const days = f.paymentTermDays ?? 0;
                            const emissionDate = new Date(updated.dataEmissao + 'T00:00:00');
                            const dueDate = new Date(emissionDate.getTime());
                            dueDate.setDate(emissionDate.getDate() + days);
                            updated.dataVencimento = dueDate.toISOString().split('T')[0];
                          }
                          return { ...prev, [f.clientId]: updated };
                        });
                      };

                      const totalBase = displayTotalValor;
                      const finalTotal = (totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);

                      return (
                        <div className="p-6 bg-white dark:bg-slate-950 grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Coluna Esquerda: Valores */}
                          <div className="space-y-4">
                            <h4 className="font-bold text-sm uppercase text-slate-400 tracking-wider">Detalhamento Financeiro</h4>
                            
                            <div className="grid grid-cols-3 items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                              <span className="text-xs font-bold text-slate-500">Importe Total Horas</span>
                              <div className="col-span-2 font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">
                                € {totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                              <span className="text-xs font-bold text-slate-500">Incrementos (€)</span>
                              <Input 
                                type="number" 
                                className="h-8 text-xs font-bold w-28 bg-slate-50 dark:bg-slate-900" 
                                value={adj.incrementos || ''} 
                                onChange={(e) => handleFieldChange('incrementos', Number(e.target.value))} 
                              />
                              <Input 
                                placeholder="Descrição do Incremento" 
                                className="h-8 text-xs bg-slate-50 dark:bg-slate-900 w-full"
                                value={adj.incrementosDesc || ''}
                                onChange={(e) => handleFieldChange('incrementosDesc', e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                              <span className="text-xs font-bold text-slate-500">Reduções / Descontos (€)</span>
                              <Input 
                                type="number" 
                                className="h-8 text-xs font-bold w-28 bg-slate-50 dark:bg-slate-900" 
                                value={adj.reducoes || ''} 
                                onChange={(e) => handleFieldChange('reducoes', Number(e.target.value))} 
                              />
                              <Input 
                                placeholder="Descrição do Desconto" 
                                className="h-8 text-xs bg-slate-50 dark:bg-slate-900 w-full"
                                value={adj.reducoesDesc || ''}
                                onChange={(e) => handleFieldChange('reducoesDesc', e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4">
                              <span className="text-xs font-bold text-slate-500">IVA (%)</span>
                              <Input 
                                type="number" 
                                className="h-8 text-xs font-bold w-28 bg-slate-50 dark:bg-slate-900" 
                                value={adj.ivaPct ?? 0} 
                                onChange={(e) => handleFieldChange('ivaPct', Number(e.target.value))} 
                              />
                              <span className="text-xs text-muted-foreground italic">(Geralmente 0% por ser intercomunitário)</span>
                            </div>

                            <div className="grid grid-cols-3 items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">TOTAL FATURA</span>
                              <div className="col-span-2 text-lg font-extrabold text-emerald-600 dark:text-emerald-500 font-mono">
                                € {finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-slate-500">Descrição do Serviço de Facturação</span>
                              <textarea
                                className="w-full h-16 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={adj.descricaoServico || ''}
                                onChange={(e) => handleFieldChange('descricaoServico', e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Coluna Direita: Dados Adicionais */}
                          <div className="space-y-4">
                            <h4 className="font-bold text-sm uppercase text-slate-400 tracking-wider">Dados Adicionais</h4>
                            
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-slate-500">Dados de Pagamento (NIB / IBAN / SWIFT)</span>
                              <textarea
                                className="w-full h-20 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={adj.iban || ''}
                                onChange={(e) => handleFieldChange('iban', e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500">Fecha de Emisión</span>
                                <Input 
                                  type="date" 
                                  className="h-8 text-xs font-semibold bg-slate-50 dark:bg-slate-900" 
                                  value={adj.dataEmissao || ''} 
                                  onChange={(e) => handleFieldChange('dataEmissao', e.target.value)} 
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-slate-500">Fecha de Vencimiento</span>
                                <Input 
                                  type="date" 
                                  className="h-8 text-xs font-semibold bg-slate-50 dark:bg-slate-900" 
                                  value={adj.dataVencimento || ''} 
                                  onChange={(e) => handleFieldChange('dataVencimento', e.target.value)} 
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-500">Condiciones de pago del cliente</span>
                              <Input 
                                disabled
                                className="h-8 text-xs font-semibold bg-slate-100 dark:bg-slate-900/50 cursor-not-allowed" 
                                value={adj.condicoesPagamento || ''} 
                              />
                            </div>

                            <div className="pt-2 flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1 bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-bold py-1.5"
                                onClick={() => {
                                  toast.success("Ajustes salvos temporariamente na memória local. Eles serão gravados permanentemente no banco de dados ao Solicitar Aprovação.");
                                }}
                              >
                                <Check size={14} className="text-emerald-500" /> Salvar Ajustes
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Aba 4: Informe */}
                    {getActiveTab(f.clientId) === 'informe' && (() => {
                      const adj = clientAdjustments[f.clientId] || initAdjustments(f);
                      const totalBase = displayTotalValor;
                      const finalTotal = (totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);
                      const periodStr = `${getMonthName(f.month)} / ${f.year}`;

                      return (
                        <div className="p-8 bg-slate-100 dark:bg-slate-950/40 flex justify-center">
                          {/* Folha A4 simulada */}
                          <div className="w-full max-w-[800px] bg-white dark:bg-slate-900 p-8 shadow-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded text-left">
                            {/* Header */}
                            <div className="flex justify-between items-start border-b-2 border-slate-100 dark:border-slate-800 pb-6 mb-6">
                              <div className="space-y-1">
                                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                                  {f.empresaNome.toUpperCase()}
                                </h3>
                                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Informe de Facturación</p>
                                <p className="text-[10px] text-muted-foreground">MCS - Gestão Comercial</p>
                              </div>
                              <div className="text-right text-xs space-y-1">
                                <p className="font-bold text-slate-500 uppercase text-[10px]">Documento</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">IF-{f.year}/0760</p>
                                <p className="text-muted-foreground mt-2">Emissão: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(adj.dataEmissao + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                                <p className="text-muted-foreground">Vencimento: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(adj.dataVencimento + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                              </div>
                            </div>

                            {/* Emissor e Cliente */}
                            <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-900 space-y-1">
                                <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Emissor</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{f.empresaNome} LDA</p>
                                <p className="text-muted-foreground">CIF/NIF: PT517834747</p>
                                <p className="text-muted-foreground">R. São Tomé e Príncipe, 287 - Vila Nova de Gaia</p>
                                <p className="text-muted-foreground">Portugal</p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-900 space-y-1">
                                <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Cliente</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{f.clientName}</p>
                                <p className="text-muted-foreground">NIF: ES55350245</p>
                                <p className="text-muted-foreground">Pol. Ind. MERCADERIES C/1 NAU</p>
                                <p className="text-muted-foreground">Espanha</p>
                              </div>
                            </div>

                            {/* Resumo de Importe */}
                            <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Resumen de Importe</h5>
                            <Table className="border border-slate-100 dark:border-slate-800 rounded mb-6 text-xs">
                              <TableHeader className="bg-slate-50 dark:bg-slate-950">
                                <TableRow>
                                  <TableHead className="font-bold">Concepto</TableHead>
                                  <TableHead className="text-right font-bold w-28">Valor (€)</TableHead>
                                  <TableHead className="font-bold">Descripción</TableHead>
                                  <TableHead className="text-right font-bold w-32">Total (€)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-medium">Importe total</TableCell>
                                  <TableCell className="text-right font-semibold">€ {totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  <TableCell className="text-muted-foreground">{adj.descricaoServico}</TableCell>
                                  <TableCell className="text-right font-semibold font-mono">€ {totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                                {Number(adj.incrementos) > 0 && (
                                  <TableRow>
                                    <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">Incrementos</TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">€ {Number(adj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-muted-foreground">{adj.incrementosDesc || 'Adicional'}</TableCell>
                                    <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">€ {Number(adj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                )}
                                {Number(adj.reducoes) > 0 && (
                                  <TableRow>
                                    <TableCell className="font-medium text-rose-600 dark:text-rose-400">Reducciones</TableCell>
                                    <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">€ -{Number(adj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-muted-foreground">{adj.reducoesDesc || 'Desconto'}</TableCell>
                                    <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400 font-mono">€ -{Number(adj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                )}
                                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                  <TableCell className="font-bold text-slate-800 dark:text-slate-200" colSpan={3}>Total a facturar</TableCell>
                                  <TableCell className="text-right font-extrabold text-slate-900 dark:text-slate-100 text-sm font-mono">
                                    € {finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>

                            {/* Resumo de Horas por Obra */}
                            <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Resumo de Horas por Obra</h5>

                            <div className="text-center font-bold text-xs bg-slate-100 dark:bg-slate-950 py-1 rounded text-slate-700 dark:text-slate-400 mb-6">
                              OBRA: {selectedObra ? selectedObra.name.toUpperCase() : 'TODAS AS OBRAS'}
                            </div>

                            {/* Relação de Trabalhadores */}
                            <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Relación de Trabajadores</h5>
                            <Table className="border border-slate-100 dark:border-slate-800 rounded text-xs mb-8">
                              <TableHeader className="bg-slate-50 dark:bg-slate-950">
                                <TableRow>
                                  <TableHead className="font-bold pl-4">Trabajador</TableHead>
                                  <TableHead className="text-right font-bold w-40">Cantidad de horas</TableHead>
                                  <TableHead className="text-right font-bold w-40">Precio hora (€)</TableHead>
                                  <TableHead className="text-right font-bold w-40 pr-4">Total (€)</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredWorkers.map(w => (
                                  <TableRow key={w.workerId}>
                                    <TableCell className="font-semibold text-slate-800 dark:text-slate-200 pl-4">{w.workerName}</TableCell>
                                    <TableCell className="text-right font-medium">{w.totalHoras.toFixed(2)}h</TableCell>
                                    <TableCell className="text-right font-medium">€ {w.tarifa.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-bold pr-4 font-mono">€ {w.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                  <TableCell className="font-bold pl-4">Totales</TableCell>
                                  <TableCell className="text-right font-bold">{displayTotalHoras.toFixed(2)}h</TableCell>
                                  <TableCell className="text-right">-</TableCell>
                                  <TableCell className="text-right font-extrabold pr-4 font-mono">€ {totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>

                            {/* Informações Bancárias */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 text-xs text-muted-foreground space-y-1 whitespace-pre-line font-medium leading-relaxed">
                              <span className="font-bold uppercase text-slate-400 text-[9px] block mb-1">Dados de Depósito / IBAN</span>
                              {adj.iban}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Aba 5: Factura Única */}
                    {getActiveTab(f.clientId) === 'factura' && (() => {
                      const adj = clientAdjustments[f.clientId] || initAdjustments(f);
                      const totalBase = displayTotalValor;
                      const finalTotal = (totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);
                      const periodStr = `${getMonthName(f.month)} / ${f.year}`;

                      return (
                        <div className="p-8 bg-slate-100 dark:bg-slate-950/40 flex justify-center">
                          {/* Folha A4 da Fatura */}
                          <div className="w-full max-w-[800px] bg-white dark:bg-slate-900 p-8 shadow-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded text-left relative">
                            
                            {selectedObra && (
                              <div className="text-center font-bold text-xs bg-slate-100 dark:bg-slate-950 py-1 rounded text-slate-700 dark:text-slate-400 mb-6">
                                OBRA: {selectedObra.name.toUpperCase()}
                              </div>
                            )}

                            {/* Top row */}
                            <div className="flex justify-between items-start mb-8">
                              <div>
                                <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 font-mono">
                                  Factura 2026/0347
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ORIGINAL</p>
                              </div>
                              {/* QR Code Mock */}
                              <div className="border border-slate-200 dark:border-slate-700 p-1 bg-white rounded shadow-sm">
                                <div className="w-14 h-14 bg-slate-100 flex flex-col items-center justify-center text-[7px] text-slate-400 font-bold border border-dashed border-slate-300">
                                  <span>MOCK QR</span>
                                  <div className="grid grid-cols-3 gap-0.5 mt-1">
                                    <div className="w-1.5 h-1.5 bg-slate-400"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400"></div>
                                    <div className="w-1.5 h-1.5 bg-slate-400"></div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* De / Para */}
                            <div className="grid grid-cols-2 gap-8 mb-8 text-[11px] leading-relaxed">
                              <div>
                                <p className="font-bold text-[9px] text-slate-400 uppercase">De</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{f.empresaNome}, Unipessoal Lda</p>
                                <p className="text-muted-foreground">Rua Padre António Maria Pinho, n.º 353</p>
                                <p className="text-muted-foreground">4460-853 Vila Nova de Gaia</p>
                                <p className="text-muted-foreground">NIF: PT517834747</p>
                                <p className="text-muted-foreground mt-2 font-semibold">Conta:</p>
                                <p className="text-muted-foreground font-mono text-[10px] whitespace-pre-line">{adj.iban.split('\n')[0]}</p>
                              </div>
                              <div>
                                <p className="font-bold text-[9px] text-slate-400 uppercase">Para</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{f.clientName}</p>
                                <p className="text-muted-foreground">AVENIDA DE LA INDUSTRIA 14, 25190</p>
                                <p className="text-muted-foreground">LLEIDA, Espanha</p>
                                <p className="text-muted-foreground mt-2">Data Emissão: <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(adj.dataEmissao + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                                <p className="text-muted-foreground">Data Vencimento: <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(adj.dataVencimento + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                              </div>
                            </div>

                            {/* Tabela de Itens (Orange Accent) */}
                            <div className="bg-orange-500 text-white font-bold text-xs uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0">
                              Lista de Artigos
                            </div>
                            <Table className="border border-slate-200 dark:border-slate-800 rounded-b text-[11px] mb-6">
                              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
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
                                  <TableCell className="text-muted-foreground">{adj.descricaoServico}</TableCell>
                                  <TableCell className="text-right">{displayTotalHoras.toFixed(2)}</TableCell>
                                  <TableCell>UN</TableCell>
                                  <TableCell className="text-right">€ {(totalBase / (displayTotalHoras || 1)).toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-bold pr-3 font-mono">€ {totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                                {Number(adj.incrementos) > 0 && (
                                  <TableRow>
                                    <TableCell className="font-semibold text-emerald-600 pl-3">INC-ADIC</TableCell>
                                    <TableCell className="text-muted-foreground">{adj.incrementosDesc || 'Incremento Adicional'}</TableCell>
                                    <TableCell className="text-right">1.00</TableCell>
                                    <TableCell>UN</TableCell>
                                    <TableCell className="text-right">€ {Number(adj.incrementos).toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600 pr-3 font-mono">€ {Number(adj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                )}
                                {Number(adj.reducoes) > 0 && (
                                  <TableRow>
                                    <TableCell className="font-semibold text-rose-600 pl-3">DESC-COM</TableCell>
                                    <TableCell className="text-muted-foreground">{adj.reducoesDesc || 'Redução Comercial'}</TableCell>
                                    <TableCell className="text-right">1.00</TableCell>
                                    <TableCell>UN</TableCell>
                                    <TableCell className="text-right">€ -{Number(adj.reducoes).toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-bold text-rose-600 pr-3 font-mono">€ -{Number(adj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>

                            {/* Resumo da Fatura (Orange Accent) */}
                            <div className="bg-orange-500 text-white font-bold text-xs uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0">
                              Resumo
                            </div>
                            <Table className="border border-slate-200 dark:border-slate-800 rounded-b text-[11px] mb-6">
                              <TableBody>
                                <TableRow>
                                  <TableCell className="font-bold" colSpan={3}>Subtotal da Obra</TableCell>
                                  <TableCell className="text-right font-bold w-40 pr-3 font-mono font-mono">€ {(totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell className="font-bold" colSpan={3}>IVA {adj.ivaPct}%</TableCell>
                                  <TableCell className="text-right font-bold w-40 pr-3 font-mono font-mono">€ {((totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * Number(adj.ivaPct || 0)/100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                                <TableRow className="bg-orange-50/50 dark:bg-orange-950/10">
                                  <TableCell className="font-extrabold text-orange-800 dark:text-orange-400" colSpan={3}>Total da Fatura</TableCell>
                                  <TableCell className="text-right font-extrabold text-orange-900 dark:text-orange-300 text-xs pr-3 font-mono">
                                    € {finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>

                            {/* Condições de IVA */}
                            <div className="text-[10px] text-muted-foreground mb-6 font-semibold">
                              Condições de Enquadramento de IVA:<br/>
                              (1) M09-IVA - autoliquidação
                            </div>

                            {/* Rodapé da fatura */}
                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between text-[9px] text-muted-foreground font-medium">
                              <div>
                                <p className="font-bold uppercase mb-0.5">Local de Carga</p>
                                <p>Rua Conselheiro Fonseca, n.º 157</p>
                                <p>4405-853 Vila Nova de Gaia</p>
                                <p>Portugal</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold uppercase mb-0.5">Local de Descarga</p>
                                <p>AVENIDA DE LA INDUSTRIA 14, 25190 LLEIDA</p>
                                <p>Espanha</p>
                              </div>
                            </div>
                            <div className="text-center text-[8px] text-muted-foreground mt-4 italic font-semibold">
                              Rexx - Processado por Programas Certificado nº 1123/AT
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Diálogo para edição de tarifa */}
      <Dialog open={isTariffDialogOpen} onOpenChange={(open) => !open && setIsTariffDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit2 className="w-5 h-5" />
              Editar Tarifa
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Ajuste a tarifa do trabalhador **{selectedTariffData?.workerName}** no cliente **{selectedTariffData?.clientName}** para o período selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-500">Nova Tarifa Horária (€)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 28.00"
                value={newTariffValue}
                onChange={(e) => setNewTariffValue(e.target.value)}
                className="text-lg font-bold"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTariffDialogOpen(false)} disabled={updatingTariff}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTariff} disabled={updatingTariff} className="bg-blue-600 hover:bg-blue-700 text-white">
              {updatingTariff && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Tarifa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Preparar E-mail */}
      <Dialog open={isEmailModalOpen} onOpenChange={(open) => !open && setIsEmailModalOpen(false)}>
        <DialogContent className="sm:max-w-4xl lg:max-w-5xl p-0 overflow-hidden flex flex-col lg:flex-row dark:bg-slate-900 dark:border-slate-800">
          
          {(() => {
            const currentFaturamento = faturamentos.find(f => f.clientId === emailData?.clientId);
            if (!emailData || !currentFaturamento) return null;

            const currentAdj = clientAdjustments[emailData.clientId] || initAdjustments(currentFaturamento);
            const currentTotalBase = currentFaturamento.totalValor;
            const currentFinalTotal = (currentTotalBase + Number(currentAdj.incrementos || 0) - Number(currentAdj.reducoes || 0)) * (1 + Number(currentAdj.ivaPct || 0)/100);

            // Available emails list
            const emailOptions: Array<{ id: string; email: string; label: string }> = [];
            if (currentFaturamento.billingEmail) {
              emailOptions.push({
                id: 'billing_email',
                email: currentFaturamento.billingEmail,
                label: `E-mail de Faturamento (${currentFaturamento.billingEmail})`
              });
            }
            if (currentFaturamento.clientEmail) {
              emailOptions.push({
                id: 'client_email',
                email: currentFaturamento.clientEmail,
                label: `E-mail Geral (${currentFaturamento.clientEmail})`
              });
            }
            
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
                    <p className="text-[10px] text-muted-foreground mt-0.5">Faturamento Operacional | Período: {formatPeriodo(new Date(currentFaturamento.year, currentFaturamento.month, 15).toISOString())}</p>
                  </div>

                  <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm leading-relaxed">
                    <div className="grid grid-cols-2 gap-3 text-slate-700 dark:text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Cliente</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{currentFaturamento.clientName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Empresa</span>
                        <span className="font-medium">Stocco</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total de Horas</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{currentFaturamento.totalHoras.toFixed(2)}h</span>
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
                              <td className="p-2.5 font-medium">Acréscimos ({currentAdj.incrementosDesc || 'Adicional Obra'})</td>
                              <td className="p-2.5 text-right font-bold">€ +{Number(currentAdj.incrementos).toFixed(2)}</td>
                            </tr>
                          )}
                          {Number(currentAdj.reducoes) > 0 && (
                            <tr className="border-b dark:border-slate-800 text-rose-600">
                              <td className="p-2.5 font-medium">Reduções ({currentAdj.reducoesDesc || 'Desconto Comercial'})</td>
                              <td className="p-2.5 text-right font-bold">€ -{Number(currentAdj.reducoes).toFixed(2)}</td>
                            </tr>
                          )}
                          <tr className="bg-slate-50 dark:bg-slate-950 font-extrabold border-t dark:border-slate-800">
                            <td className="p-2.5 text-slate-800 dark:text-slate-200">Total a Faturar (IVA {currentAdj.ivaPct}%)</td>
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
                      id="send_email_chk_billing"
                      checked={sendEmailCheckbox}
                      onChange={e => setSendEmailCheckbox(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="send_email_chk_billing" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
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
                      Confirmar e Enviar E-mail
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}

        </DialogContent>
      </Dialog>

    </div>
  );
}
