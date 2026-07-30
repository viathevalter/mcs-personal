import React, { useEffect, useState } from 'react';
import { supabase } from '@/shared/supabase/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  getHorasPendentesFaturamento, 
  solicitarAprovacaoCliente, 
  atualizarHorasDiarias, 
  atualizarTarifaFaturada,
  cancelarFatura
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
  Trash2,
  FileSpreadsheet,
  Send,
  Check,
  Search,
  Download,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresa } from '../../../app/providers/EmpresaProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const getBillingCycleDays = (startDay: number, year: number, monthIndex: number) => {
  const days: Array<{ day: number; month: number; year: number; dateStr: string; label: string; monthLabel: string }> = [];
  const getMonthAbbr = (mIndex: number) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[mIndex] || '';
  };

  if (startDay === 1) {
    const numDays = new Date(year, monthIndex + 1, 0).getDate();
    for (let d = 1; d <= numDays; d++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: monthIndex + 1,
        year,
        dateStr,
        label: String(d).padStart(2, '0'),
        monthLabel: getMonthAbbr(monthIndex)
      });
    }
  } else {
    let prevYear = year;
    let prevMonthIndex = monthIndex - 1;
    if (prevMonthIndex < 0) {
      prevMonthIndex = 11;
      prevYear = year - 1;
    }
    const prevMonthDays = new Date(prevYear, prevMonthIndex + 1, 0).getDate();
    for (let d = startDay; d <= prevMonthDays; d++) {
      const dateStr = `${prevYear}-${String(prevMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: prevMonthIndex + 1,
        year: prevYear,
        dateStr,
        label: String(d).padStart(2, '0'),
        monthLabel: getMonthAbbr(prevMonthIndex)
      });
    }
    for (let d = 1; d < startDay; d++) {
      const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        day: d,
        month: monthIndex + 1,
        year,
        dateStr,
        label: String(d).padStart(2, '0'),
        monthLabel: getMonthAbbr(monthIndex)
      });
    }
  }
  return days;
};

export function FaturasPendentes() {
  const [faturamentos, setFaturamentos] = useState<ClientBillingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedObraByClient, setSelectedObraByClient] = useState<Record<string, string | null>>(() => {
    try {
      const saved = sessionStorage.getItem('mcs:selectedObraByClient');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [processingClient, setProcessingClient] = useState<string | null>(null);

  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem('mcs:expandedClients');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const [expandedWorkers, setExpandedWorkers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedEmpresaId } = useEmpresa();

  const [clientActiveTabs, setClientActiveTabs] = useState<Record<string, 'edicao' | 'datas_trabalhadas' | 'importe' | 'informe' | 'factura'>>(() => {
    try {
      const saved = sessionStorage.getItem('mcs:clientActiveTabs');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

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
  const [clientAdjustments, setClientAdjustments] = useState<Record<string, ClientAdjustments>>(() => {
    try {
      const saved = sessionStorage.getItem('mcs:clientAdjustments');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Sync state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('mcs:selectedObraByClient', JSON.stringify(selectedObraByClient));
  }, [selectedObraByClient]);

  useEffect(() => {
    sessionStorage.setItem('mcs:expandedClients', JSON.stringify(expandedClients));
  }, [expandedClients]);

  useEffect(() => {
    sessionStorage.setItem('mcs:clientActiveTabs', JSON.stringify(clientActiveTabs));
  }, [clientActiveTabs]);

  useEffect(() => {
    sessionStorage.setItem('mcs:clientAdjustments', JSON.stringify(clientAdjustments));
  }, [clientAdjustments]);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState<{
    clientId: string;
    cardId: string;
    clientName: string;
    recipientEmail: string;
    subject: string;
    body: string;
    horasIds: string[];
    token: string;
    totalBase: number;
  } | null>(null);

  const [emailLanguage, setEmailLanguage] = useState<'pt' | 'es' | 'en'>('pt');
  
  const getTranslatedMonthName = (monthIndex: number, lang: 'pt' | 'es' | 'en') => {
    const ptMonths = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const esMonths = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const enMonths = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (lang === 'es') return esMonths[monthIndex];
    if (lang === 'en') return enMonths[monthIndex];
    return ptMonths[monthIndex];
  };

  const handleLanguageChange = (lang: 'pt' | 'es' | 'en') => {
    setEmailLanguage(lang);
    if (!emailData) return;
    
    // Find billing info to reconstruct subject/body
    const faturamento = faturamentos.find(f => f.clientId === emailData.clientId);
    if (!faturamento) return;

    const selectedObraId = selectedObraByClient[emailData.cardId];
    const selectedObra = selectedObraId !== undefined
      ? faturamento.obras.find(o => o.id === selectedObraId)
      : null;

    const adj = clientAdjustments[emailData.cardId] || initAdjustments(faturamento);
    const finalTotal = (emailData.totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);

    const monthStr = getTranslatedMonthName(faturamento.month, lang);
    const periodStr = lang === 'pt' ? `${monthStr} de ${faturamento.year}` : lang === 'es' ? `${monthStr} de ${faturamento.year}` : `${monthStr} ${faturamento.year}`;
    
    const obraSuffix = selectedObra ? (lang === 'pt' ? ` - Obra: ${selectedObra.name}` : lang === 'es' ? ` - Obra: ${selectedObra.name}` : ` - Worksite: ${selectedObra.name}`) : '';
    
    let subject = '';
    let body = '';
    const link = `${window.location.origin}/aprovacao-cliente/${emailData.token}`;

    const docNum = String(faturamento.faturaNumero || faturamento.empresaNextInvoiceNumber || '0001').padStart(4, '0');
    if (lang === 'es') {
      subject = `MCS - Solicitud de Aprobación de Horas - ${faturamento.clientName}${obraSuffix} - ${periodStr}`;
      body = `Hola,

Nos gustaría solicitar su aprobación para el informe de facturación correspondiente al período de ${periodStr}${selectedObra ? ` (Obra: ${selectedObra.name})` : ''}.

Adjunto encontrará los siguientes documentos para su análisis:
1. Informe de Facturación (IF-${faturamento.year}/${docNum})${selectedObra ? ` - ref. Obra: ${selectedObra.name}` : ''}
2. Hoja de horas detallada con las fechas trabajadas
3. Factura Pro-forma correspondiente por un valor de € ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Por favor, utilice el siguiente enlace para ver los documentos de manera interactiva y aprobar o disputar las horas:
${link}

Si tiene alguna pregunta, contáctenos respondiendo a este correo electrónico.

Atentamente,
MCS - Gestión Comercial`;
    } else if (lang === 'en') {
      subject = `MCS - Hours Approval Request - ${faturamento.clientName}${obraSuffix} - ${periodStr}`;
      body = `Hello,

We would like to request your approval for the billing report for the period of ${periodStr}${selectedObra ? ` (Worksite: ${selectedObra.name})` : ''}.

Attached you will find the following documents for your analysis:
1. Billing Report (IF-${faturamento.year}/${docNum})${selectedObra ? ` - ref. Worksite: ${selectedObra.name}` : ''}
2. Detailed timesheet with the dates worked
3. Corresponding Pro-forma invoice in the amount of € ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Please use the link below to view the documents interactively and approve or dispute the hours:
${link}

If you have any questions, please contact us by replying to this email.

Best regards,
MCS - Commercial Management`;
    } else {
      subject = `MCS - Solicitação de Aprovação de Horas - ${faturamento.clientName}${obraSuffix} - ${periodStr}`;
      body = `Olá,

Gostaríamos de solicitar a sua aprovação para o relatório de faturamento referente ao período de ${periodStr}${selectedObra ? ` (Obra: ${selectedObra.name})` : ''}.

Em anexo, você encontrará os seguintes documentos para a sua análise:
1. Informe de Facturación (IF-${faturamento.year}/${docNum})${selectedObra ? ` - ref. Obra: ${selectedObra.name}` : ''}
2. Folha de ponto detalhada com as datas trabalhadas
3. Fatura Pró-forma correspondente no valor de € ${finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Por favor, utilize o link abaixo para visualizar os documentos de forma interativa e aprovar ou contestar as horas:
${link}

Se tiver alguma dúvida, entre em contato respondendo a este e-mail.

Atenciosamente,
MCS - Gestão Comercial`;
    }

    setEmailData(prev => prev ? { ...prev, subject, body } : null);
  };

  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [sendEmailCheckbox, setSendEmailCheckbox] = useState(true);

  const [checkingViesClient, setCheckingViesClient] = useState<string | null>(null);

  const handleCheckVies = async (f: ClientBillingSummary) => {
    if (!f.taxId || !f.countryId) {
      toast.error('Cliente não possui NIF ou País Fiscal configurados.');
      return;
    }
    
    try {
      setCheckingViesClient(f.clientId);
      toast.loading('Consultando registro VIES da Comissão Europeia...', { id: 'vies-loading' });
      
      const { data: country, error: countryErr } = await supabase
        .schema('core_common')
        .from('countries')
        .select('iso2')
        .eq('id', f.countryId)
        .single();
        
      if (countryErr || !country?.iso2) {
        throw new Error('Falha ao obter o código ISO2 do país do cliente.');
      }
      
      const countryCode = country.iso2.toUpperCase();
      const cleanTax = f.taxId.trim().toUpperCase().replace(/[\s\.\-\,]+/g, '');
      const vatNumber = cleanTax.startsWith(countryCode)
        ? cleanTax.substring(countryCode.length)
        : cleanTax;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/check-vies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          client_id: f.clientId,
          country_code: countryCode,
          vat_number: vatNumber,
          trigger_source: 'manual'
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Erro na API VIES: Status ${response.status}`);
      }

      const result = await response.json();
      toast.dismiss('vies-loading');
      
      if (result.valid) {
        toast.success('VIES validado com sucesso! Número de IVA ativo.');
      } else {
        toast.warning('O número de IVA informado foi rejeitado pelo VIES ou está inativo.');
      }
      
      await fetchHoras();
    } catch (err: any) {
      console.error('Erro na validação VIES:', err);
      toast.dismiss('vies-loading');
      toast.error('Falha na validação VIES: ' + err.message);
    } finally {
      setCheckingViesClient(null);
    }
  };

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

    const defaultIban = f.empresaBankDetails || (f.empresaIban ? `IBAN: ${f.empresaIban}` : "NIB: PT50 0018 000365089609020 15\nBanco Santander\nSWIFT: TOTAPPTPL");
    let ibanVal = f.ajustesJson?.iban ?? defaultIban;
    if (f.empresaBankDetails && ibanVal && (!ibanVal.includes('\n') || ibanVal.startsWith('IBAN:'))) {
      ibanVal = f.empresaBankDetails;
    }
    const defaultDesc = `Prestação de Serviços - ${getMonthName(f.month)} ${f.year} - Obra: Sin Obra`;

    return {
      incrementos: f.ajustesJson?.incrementos ?? 0,
      incrementosDesc: f.ajustesJson?.incrementos_desc ?? '',
      reducoes: f.ajustesJson?.reducoes ?? 0,
      reducoesDesc: f.ajustesJson?.reducoes_desc ?? '',
      ivaPct: f.ajustesJson?.iva_pct ?? 0,
      iban: ibanVal,
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

      // Initialize adjustments state, keeping user changes from session state if present
      const initialAdjustments: Record<string, ClientAdjustments> = {};
      const saved = sessionStorage.getItem('mcs:clientAdjustments');
      const savedAdjustments = saved ? JSON.parse(saved) : {};
      
      data.forEach(f => {
        initialAdjustments[f.clientId] = savedAdjustments[f.clientId] || clientAdjustments[f.clientId] || initAdjustments(f);
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

  const handleSolicitarAprovacao = (clientId: string, workers: any[], cardId: string) => {
    const selectedObraId = selectedObraByClient[cardId];
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

    const adj = clientAdjustments[cardId] || initAdjustments(faturamento);
    const totalBase = workers.reduce((sum, w) => sum + w.totalValor, 0);
    const finalTotal = (totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);

    const periodStr = `${getMonthName(faturamento.month)} de ${faturamento.year}`;
    const obraSuffix = selectedObra ? ` - Obra: ${selectedObra.name}` : '';
    const subject = `MCS - Solicitação de Aprovação de Horas - ${faturamento.clientName}${obraSuffix} - ${periodStr}`;
    
    const previewToken = crypto.randomUUID(); 
    const link = `${window.location.origin}/aprovacao-cliente/${previewToken}`;
    const docNum = String(faturamento.faturaNumero || faturamento.empresaNextInvoiceNumber || '0001').padStart(4, '0');
    
    const body = `Olá,

Gostaríamos de solicitar a sua aprovação para o relatório de faturamento referente ao período de ${periodStr}${selectedObra ? ` (Obra: ${selectedObra.name})` : ''}.

Em anexo, você encontrará os seguintes documentos para a sua análise:
1. Informe de Facturación (IF-${faturamento.year}/${docNum})${selectedObra ? ` - ref. Obra: ${selectedObra.name}` : ''}
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
    setEmailLanguage('pt');

    setEmailData({
      clientId,
      cardId,
      clientName: faturamento.clientName,
      recipientEmail: defaultEmails.join(", "),
      subject,
      body,
      horasIds,
      token: previewToken,
      totalBase
    });
    setIsEmailModalOpen(true);
  };

  const generatePDFAttachment = async (cardId: string, clientName: string, type: 'informe' | 'factura'): Promise<{ name: string, contentType: string, contentBytes: string } | null> => {
    const elementId = `${type}-sheet-${cardId}`;
    let element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element not found for PDF capture: ${elementId}`);
      return null;
    }

    const parentWrapper = element.closest('.hidden');
    const wasHidden = !!parentWrapper;

    if (wasHidden && parentWrapper) {
      parentWrapper.classList.remove('hidden');
      parentWrapper.classList.add('block');
      (parentWrapper as HTMLElement).style.position = 'absolute';
      (parentWrapper as HTMLElement).style.left = '-9999px';
      (parentWrapper as HTMLElement).style.top = '0';
      (parentWrapper as HTMLElement).style.width = '800px';
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.82);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      const filename = type === 'informe' ? 'Informe_Facturacion.pdf' : 'Factura_Pro-forma.pdf';

      if (wasHidden && parentWrapper) {
        parentWrapper.classList.remove('block');
        parentWrapper.classList.add('hidden');
        (parentWrapper as HTMLElement).style.position = '';
        (parentWrapper as HTMLElement).style.left = '';
        (parentWrapper as HTMLElement).style.top = '';
        (parentWrapper as HTMLElement).style.width = '';
      }

      return {
        name: filename,
        contentType: 'application/pdf',
        contentBytes: pdfBase64
      };
    } catch (err) {
      console.error(`Error generating ${type} PDF:`, err);
      if (wasHidden && parentWrapper) {
        parentWrapper.classList.remove('block');
        parentWrapper.classList.add('hidden');
        (parentWrapper as HTMLElement).style.position = '';
        (parentWrapper as HTMLElement).style.left = '';
        (parentWrapper as HTMLElement).style.top = '';
        (parentWrapper as HTMLElement).style.width = '';
      }
      return null;
    }
  };

  const generateHoursPDFAttachment = async (f: ClientBillingSummary): Promise<{ name: string, contentType: string, contentBytes: string } | null> => {
    if (!emailData) return null;
    
    // Create a temporary container for the PDF content
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1120px'; // standard landscape width
    container.style.padding = '40px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    
    const monthStr = getTranslatedMonthName(f.month, emailLanguage);
    const periodStr = emailLanguage === 'en' ? `${monthStr} ${f.year}` : `${monthStr} de ${f.year}`;
    
    const labels = {
      title: emailLanguage === 'pt' ? 'Relatório de Horas' : emailLanguage === 'es' ? 'Informe de Horas' : 'Timesheet Report',
      client: emailLanguage === 'pt' ? 'Cliente' : emailLanguage === 'es' ? 'Cliente' : 'Client',
      period: emailLanguage === 'pt' ? 'Período' : emailLanguage === 'es' ? 'Período' : 'Period',
      totalHours: emailLanguage === 'pt' ? 'Total de Horas' : emailLanguage === 'es' ? 'Total de Horas' : 'Total Hours',
      baseBilling: emailLanguage === 'pt' ? 'Faturamento Base' : emailLanguage === 'es' ? 'Facturación Base' : 'Base Billing',
      worker: emailLanguage === 'pt' ? 'Trabalhador' : emailLanguage === 'es' ? 'Trabajador' : 'Worker'
    };

    // Filter workers/hours to only those matching emailData.horasIds
    const filteredWorkersForPDF = f.workers.map(w => {
      const filteredHorasDiarias = Object.entries(w.horasDiarias).reduce((acc, [date, h]: [string, any]) => {
        if (h && h.id && emailData.horasIds.includes(h.id)) {
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

    const displayTotalHoras = filteredWorkersForPDF.reduce((sum, w) => sum + w.totalHoras, 0);
    const displayTotalValor = filteredWorkersForPDF.reduce((sum, w) => sum + w.totalValor, 0);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #1e293b;">${labels.title}</h2>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">${labels.client}: <strong>${f.clientName}</strong> | ${labels.period}: <strong>${periodStr}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 13px; color: #64748b; margin: 0;">${labels.totalHours}: <strong style="color: #1e293b; font-size: 16px;">${displayTotalHoras.toFixed(2)}h</strong></p>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">${labels.baseBilling}: <strong style="color: #1e293b; font-size: 16px;">€ ${displayTotalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        </div>
      </div>
    `;

    const selectedObraId = selectedObraByClient[emailData.cardId];
    const selectedObra = selectedObraId !== undefined ? f.obras.find(o => o.id === selectedObraId) : null;

    const tablesToRender = [
      {
        title: selectedObra ? `OBRA: ${selectedObra.name.toUpperCase()}` : 'OBRA: TODAS AS OBRAS',
        workers: filteredWorkersForPDF,
        totalHoras: displayTotalHoras,
        totalValor: displayTotalValor
      }
    ];

    const cycleStartDay = f.billingCycleStartDay || 1;
    const daysArray = getBillingCycleDays(cycleStartDay, f.year, f.month);

    tablesToRender.forEach((table) => {
      let tableHtml = `
        <div style="margin-bottom: 40px; page-break-inside: avoid;">
          <div style="text-align: center; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; background-color: #f1f5f9; padding: 10px; color: #334155; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
            ${table.title}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 10px; text-align: left; font-weight: 700; color: #475569; border-right: 1px solid #e2e8f0;">${labels.worker}</th>
      `;

      daysArray.forEach(dInfo => {
        const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
        const dayOfWeek = cellDate.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const weekdays = emailLanguage === 'pt' ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] : emailLanguage === 'es' ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const label = weekdays[dayOfWeek];
        
        let headerColor = '#64748b';
        let headerBg = '';
        if (isSunday) {
          headerColor = '#e11d48';
          headerBg = 'background-color: #ffe4e6;';
        } else if (isSaturday) {
          headerColor = '#d97706';
          headerBg = 'background-color: #fef3c7;';
        }

        tableHtml += `
          <th style="text-align: center; padding: 6px 2px; min-width: 25px; ${headerBg} border-right: 1px solid #e2e8f0;">
            <div style="font-size: 7px; text-transform: uppercase; color: ${headerColor}; font-weight: 700;">${label}</div>
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-top: 2px;">${String(dInfo.day).padStart(2, '0')}</div>
          </th>
        `;
      });

      tableHtml += `
                <th style="padding: 10px; text-align: right; font-weight: 700; color: #475569;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
      `;

      table.workers.forEach(w => {
        const workerTotal = Object.values(w.horasDiarias).reduce((sum, h: any) => sum + Number(h?.horas_totais || 0), 0);
        tableHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0; white-space: nowrap;">${w.workerName}</td>
        `;

        daysArray.forEach(dInfo => {
          const dateKey = dInfo.dateStr;
          const hourObj = w.horasDiarias[dateKey] as any;
          const hoursVal = hourObj ? Number(hourObj.horas_totais || 0) : 0;
          
          const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
          const dayOfWeek = cellDate.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          let cellStyle = 'color: #94a3b8;';
          let cellBg = '';
          if (hoursVal > 0) {
            cellStyle = 'color: #2563eb; font-weight: 700;';
          }
          if (isSunday) {
            cellBg = 'background-color: #fff1f2;';
          } else if (isSaturday) {
            cellBg = 'background-color: #fffbeb;';
          }

          tableHtml += `
            <td style="text-align: center; padding: 8px 2px; ${cellBg} ${cellStyle} border-right: 1px solid #e2e8f0;">
              ${hoursVal > 0 ? hoursVal : '-'}
            </td>
          `;
        });

        tableHtml += `
            <td style="padding: 10px; text-align: right; font-weight: 700; color: #1e293b;">${workerTotal.toFixed(1)}h</td>
          </tr>
        `;
      });

      tableHtml += `
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML += tableHtml;
    });

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 1.5,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.82);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= 210;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= 210;
      }
      
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      document.body.removeChild(container);

      return {
        name: 'Relatorio_Datas_Trabalhadas.pdf',
        contentType: 'application/pdf',
        contentBytes: pdfBase64
      };
    } catch (error) {
      console.error("Erro ao gerar PDF de horas:", error);
      document.body.removeChild(container);
      return null;
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
      
      const faturamento = faturamentos.find(f => f.clientId === emailData.clientId);
      if (!faturamento) return;

      const adj = clientAdjustments[emailData.cardId] || initAdjustments(faturamento);

      const selectedObraId = selectedObraByClient[emailData.cardId];
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
        emailData.token,
        selectedEmpresaId
      );

      const toastId = toast.loading('Compilando relatórios e gerando anexos em PDF de alta qualidade. Por favor, aguarde...');

      // 1. Ensure the client card is expanded so the DOM elements are mounted and accessible
      if (!expandedClients[emailData.cardId]) {
        setExpandedClients(prev => ({ ...prev, [emailData.cardId]: true }));
        await new Promise(resolve => setTimeout(resolve, 600)); // wait for expansion transition and layout mounting
      }

      const relatorioAttachment = await generateHoursPDFAttachment(faturamento);
      const informeAttachment = await generatePDFAttachment(emailData.cardId, emailData.clientName, 'informe');
      const facturaAttachment = await generatePDFAttachment(emailData.cardId, emailData.clientName, 'factura');

      const custom_attachments = [];
      if (relatorioAttachment) custom_attachments.push(relatorioAttachment);
      if (informeAttachment) custom_attachments.push(informeAttachment);
      if (facturaAttachment) custom_attachments.push(facturaAttachment);

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
          client_name: emailData.clientName,
          custom_attachments
        }
      });

      if (functionErr) {
        console.error('Error invoking send-order-notification for billing:', functionErr);
        toast.warning('Ajustes salvos no faturamento, mas falhou ao enviar o e-mail de aprovação.', {
          description: functionErr.message,
          id: toastId
        });
      } else {
        toast.success(`E-mail com portal de aprovação enviado com sucesso para ${toEmails.join(', ')}!`, {
          id: toastId
        });
      }

      // Remove this client's adjustments from our persisted states so they get recalculated for the next billing cycle
      setClientAdjustments(prev => {
        const next = { ...prev };
        delete next[emailData.clientId];
        return next;
      });

      setIsEmailModalOpen(false);
      fetchHoras();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao solicitar aprovação: ' + err.message);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCancelFatura = async (f: ClientBillingSummary) => {
    const confirmDelete = window.confirm(
      `Tem certeza que deseja cancelar e excluir esta fatura de ${f.clientName}?\n\nTodas as horas voltarão para o estado pendente para que você possa refazer o faturamento do zero.`
    );
    if (!confirmDelete) return;

    try {
      setIsProcessing(true);
      const faturaId = f.clientHours.find(h => h.fatura_id)?.fatura_id;
      if (faturaId) {
        await cancelarFatura(faturaId);
        toast.success('Fatura cancelada com sucesso! As horas foram liberadas para novo faturamento.');
      } else {
        toast.info('Nenhuma fatura registrada para este cliente.');
      }
      fetchHoras();
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao cancelar fatura: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleClient = (cardId: string) => {
    setExpandedClients(prev => ({ ...prev, [cardId]: !prev[cardId] }));
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

  const getObraColorClasses = (index: number, isSelected: boolean) => {
    // Distinct premium pastel color themes: Slate, Blue, Emerald, Amber, Violet, Rose, Cyan
    const themes = [
      {
        // Blue
        selected: 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-100 dark:ring-blue-950 dark:bg-blue-950/40 dark:border-blue-700 dark:text-blue-100',
        idle: 'bg-blue-50/20 border-blue-100/70 text-blue-700 hover:bg-blue-50/50 hover:border-blue-300 dark:bg-blue-950/10 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/20'
      },
      {
        // Emerald
        selected: 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-100 dark:ring-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-100',
        idle: 'bg-emerald-50/20 border-emerald-100/70 text-emerald-700 hover:bg-emerald-50/50 hover:border-emerald-300 dark:bg-emerald-950/10 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/20'
      },
      {
        // Amber
        selected: 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-100 dark:ring-amber-950 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-100',
        idle: 'bg-amber-50/20 border-amber-100/70 text-amber-700 hover:bg-amber-50/50 hover:border-amber-300 dark:bg-amber-950/10 dark:border-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-950/20'
      },
      {
        // Violet
        selected: 'bg-violet-50 border-violet-500 text-violet-900 ring-2 ring-violet-100 dark:ring-violet-950 dark:bg-violet-950/40 dark:border-violet-700 dark:text-violet-100',
        idle: 'bg-violet-50/20 border-violet-100/70 text-violet-700 hover:bg-violet-50/50 hover:border-violet-300 dark:bg-violet-950/10 dark:border-violet-900/50 dark:text-violet-400 dark:hover:bg-violet-950/20'
      },
      {
        // Rose
        selected: 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-100 dark:ring-rose-950 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-100',
        idle: 'bg-rose-50/20 border-rose-100/70 text-rose-700 hover:bg-rose-50/50 hover:border-rose-300 dark:bg-rose-950/10 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/20'
      },
      {
        // Cyan
        selected: 'bg-cyan-50 border-cyan-500 text-cyan-900 ring-2 ring-cyan-100 dark:ring-cyan-950 dark:bg-cyan-950/40 dark:border-cyan-700 dark:text-cyan-100',
        idle: 'bg-cyan-50/20 border-cyan-100/70 text-cyan-700 hover:bg-sky-50/50 hover:border-sky-300 dark:bg-cyan-950/10 dark:border-cyan-900/50 dark:text-cyan-400 dark:hover:bg-cyan-950/20'
      }
    ];

    const defaultTheme = {
      selected: 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-100 dark:ring-indigo-950 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-100',
      idle: 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/30 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900/60'
    };

    if (index === -1) {
      return isSelected ? defaultTheme.selected : defaultTheme.idle;
    }

    const selectedTheme = themes[index % themes.length];
    return isSelected ? selectedTheme.selected : selectedTheme.idle;
  };

  const handleExportHoursPDF = async (f: ClientBillingSummary) => {
    toast.info("Aguarde, gerando PDF do Relatório de Horas...");
    
    // Create a temporary container for the PDF content
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1120px'; // standard landscape width
    container.style.padding = '40px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    
    // Add title & header info
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const periodStr = `${months[f.month]} / ${f.year}`;
    
    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #1e293b;">Relatório de Horas</h2>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">Cliente: <strong>${f.clientName}</strong> | Período: <strong>${periodStr}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 13px; color: #64748b; margin: 0;">Total de Horas: <strong style="color: #1e293b; font-size: 16px;">${f.totalHoras.toFixed(2)}h</strong></p>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">Faturamento Base: <strong style="color: #1e293b; font-size: 16px;">€ ${f.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        </div>
      </div>
    `;

    // Render tables list
    // 1. First table: Combined (Todas as Obras)
    const tablesToRender = [
      {
        title: 'OBRA: TODAS AS OBRAS',
        workers: f.workers,
        totalHoras: f.totalHoras,
        totalValor: f.totalValor
      }
    ];

    // 2. Subsequent tables: Each distinct Obra (if has actual Obras)
    if (f.obras && f.obras.some(o => o.id !== null)) {
      f.obras.forEach(obra => {
        // Filter workers for this Obra
        const oWorkers = f.workers.map(w => {
          const filteredHorasDiarias = Object.entries(w.horasDiarias).reduce((acc, [date, h]: [string, any]) => {
            if (h.obra_id === obra.id) {
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

        if (oWorkers.length > 0) {
          tablesToRender.push({
            title: `OBRA: ${obra.name.toUpperCase()}`,
            workers: oWorkers,
            totalHoras: obra.totalHoras,
            totalValor: obra.totalValor
          });
        }
      });
    }

    const cycleStartDay = f.billingCycleStartDay || 1;
    const daysArray = getBillingCycleDays(cycleStartDay, f.year, f.month);

    // Generate HTML for each table in tablesToRender
    tablesToRender.forEach((table) => {
      let tableHtml = `
        <div style="margin-bottom: 40px; page-break-inside: avoid;">
          <div style="text-align: center; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; background-color: #f1f5f9; padding: 10px; color: #334155; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
            ${table.title}
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 10px; text-align: left; font-weight: 700; color: #475569; border-right: 1px solid #e2e8f0;">Trabalhador</th>
      `;

      // Header days
      daysArray.forEach(dInfo => {
        const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
        const dayOfWeek = cellDate.getDay();
        const isSunday = dayOfWeek === 0;
        const isSaturday = dayOfWeek === 6;
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const label = weekdays[dayOfWeek];
        
        let headerColor = '#64748b';
        let headerBg = '';
        if (isSunday) {
          headerColor = '#e11d48';
          headerBg = 'background-color: #ffe4e6;';
        } else if (isSaturday) {
          headerColor = '#d97706';
          headerBg = 'background-color: #fef3c7;';
        }

        tableHtml += `
          <th style="text-align: center; padding: 6px 2px; min-width: 25px; ${headerBg} border-right: 1px solid #e2e8f0;">
            <div style="font-size: 7px; text-transform: uppercase; color: ${headerColor}; font-weight: 700;">${label}</div>
            <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-top: 2px;">${String(dInfo.day).padStart(2, '0')}</div>
          </th>
        `;
      });

      tableHtml += `
                <th style="padding: 10px; text-align: right; font-weight: 700; color: #475569;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Worker rows
      table.workers.forEach(w => {
        const workerTotal = Object.values(w.horasDiarias).reduce((sum, h: any) => sum + Number(h?.horas_totais || 0), 0);
        tableHtml += `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0; white-space: nowrap;">${w.workerName}</td>
        `;

        daysArray.forEach(dInfo => {
          const dateKey = dInfo.dateStr;
          const hourObj = w.horasDiarias[dateKey] as any;
          const hoursVal = hourObj ? Number(hourObj.horas_totais || 0) : 0;
          
          const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
          const dayOfWeek = cellDate.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;

          let cellStyle = 'color: #94a3b8;';
          let cellBg = '';
          if (hoursVal > 0) {
            cellStyle = 'color: #2563eb; font-weight: 700;';
          }
          if (isSunday) {
            cellBg = 'background-color: #fff1f2;';
          } else if (isSaturday) {
            cellBg = 'background-color: #fffbeb;';
          }

          tableHtml += `
            <td style="text-align: center; padding: 8px 2px; ${cellBg} ${cellStyle} border-right: 1px solid #e2e8f0;">
              ${hoursVal > 0 ? hoursVal : '-'}
            </td>
          `;
        });

        tableHtml += `
            <td style="padding: 10px; text-align: right; font-weight: 700; color: #1e293b;">${workerTotal.toFixed(1)}h</td>
          </tr>
        `;
      });

      tableHtml += `
            </tbody>
          </table>
        </div>
      `;
      container.innerHTML += tableHtml;
    });

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2, // high quality
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Standard a4 landscape is 297mm x 210mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // If height is larger than page height, handle multipage or scale
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 210;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 210;
      }
      
      pdf.save(`relatorio-horas-${f.clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success("PDF do Relatório de Horas gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o arquivo PDF: " + error.message);
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleExportA4PDF = async (cardId: string, clientName: string, type: 'informe' | 'factura') => {
    const elementId = `${type}-sheet-${cardId}`;
    const element = document.getElementById(elementId);
    
    if (!element) {
      toast.error(`Não foi possível localizar o elemento visual do ${type === 'informe' ? 'Informe' : 'Pro-forma'}.`);
      return;
    }
    
    toast.info(`Aguarde, gerando PDF do ${type === 'informe' ? 'Informe de Facturación' : 'Fatura Pró-forma'}...`);
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Standard A4 portrait is 210mm x 297mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const filename = `${type}-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      pdf.save(filename);
      toast.success(`PDF do ${type === 'informe' ? 'Informe' : 'Pro-forma'} gerado com sucesso!`);
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o arquivo PDF: " + error.message);
    }
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
            const cardId = f.magicLinkToken ? `${f.clientId}-${f.magicLinkToken}` : `${f.clientId}-pending`;
            const isProcessing = processingClient === f.clientId;
            const isExpanded = expandedClients[cardId];
            
            const cycleStartDay = f.billingCycleStartDay || 1;
            const daysArray = getBillingCycleDays(cycleStartDay, f.year, f.month);

            const isBlocked = f.statusBilling === 'waiting_validation';
            const isAlreadyInvoiced = f.statusBilling.startsWith('invoiced');

            const selectedObraId = selectedObraByClient[cardId];
            const hasObraFilter = selectedObraId !== undefined;

            // 1. All workers for the monthly grid (Aba 1)
            const allWorkers = f.workers.map(w => {
              const filteredHorasDiarias = Object.entries(w.horasDiarias).reduce((acc, [date, h]: [string, any]) => {
                if (!hasObraFilter || h.obra_id === selectedObraId) {
                  acc[date] = h;
                }
                return acc;
              }, {} as Record<string, any>);

              const wTotalHorasMes = Object.values(filteredHorasDiarias).reduce((sum, h: any) => sum + Number(h.horas_totais || 0), 0);
              const wTotalValorMes = Object.values(filteredHorasDiarias).reduce((sum, h: any) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

              return {
                ...w,
                horasDiarias: filteredHorasDiarias,
                totalHoras: wTotalHorasMes,
                totalValor: wTotalValorMes,
                totalHorasMes: wTotalHorasMes,
                totalValorMes: wTotalValorMes
              };
            }).filter(w => w.totalHorasMes > 0);

            // 2. Active billing session workers (for invoicing, previews, and PDFs)
            const filteredWorkers = f.workers.map(w => {
              const filteredHorasDiarias = Object.entries(w.horasDiarias).reduce((acc, [date, h]: [string, any]) => {
                const belongsToActiveSession = f.activeFaturaId
                  ? h.fatura_id === f.activeFaturaId
                  : h.fatura_id === null;

                if (belongsToActiveSession && (!hasObraFilter || h.obra_id === selectedObraId)) {
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

            const unbilledWorkersList = filteredWorkers.filter(w => !w.isBilled);
            const totalUnbilled = unbilledWorkersList.length;
            const validatedUnbilled = unbilledWorkersList.filter(w => w.isValidated).length;

            const totalMonthHours = f.workers.reduce((sum, w) => sum + (w.totalHorasMes ?? w.totalHoras), 0);
            const totalMonthValor = f.workers.reduce((sum, w) => sum + (w.totalValorMes ?? w.totalValor), 0);
            const totalBilledHours = Math.max(0, totalMonthHours - f.totalHoras);
            const totalBilledValor = Math.max(0, totalMonthValor - f.totalValor);

            return (
              <Card 
                key={cardId} 
                className={`overflow-hidden shadow-sm transition-all hover:shadow-md border border-slate-200 dark:border-slate-800 ${
                  isBlocked ? 'opacity-85 bg-slate-50/70 dark:bg-slate-900/10 border-dashed' : ''
                }`}
              >
                {/* Cabeçalho do Cartão (Colunas Estilizadas) */}
                <div 
                  className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  onClick={() => toggleClient(cardId)}
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
                          {f.viesApplicable && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700 text-xs shrink-0">•</span>
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] font-bold px-1.5 py-0 flex items-center gap-1 shrink-0 ${
                                  f.viesValid 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' 
                                    : f.viesStatus === 'invalid'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800'
                                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                                }`}
                                title={f.viesLastCheckedAt ? `Última consulta VIES: ${new Date(f.viesLastCheckedAt).toLocaleString('pt-PT')}` : 'Nunca verificado no VIES'}
                              >
                                VIES: {f.viesValid ? 'Válido' : f.viesStatus === 'invalid' ? 'Inválido' : 'Pendente'}
                              </Badge>
                            </>
                          )}
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
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Horas a Faturar</p>
                        <p className={`font-bold leading-none ${isBlocked ? 'text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                          {f.totalHoras.toFixed(2)}h
                        </p>
                        {totalBilledHours > 0 && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                            Já fat: {totalBilledHours.toFixed(1)}h | Total: {totalMonthHours.toFixed(1)}h
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Coluna 4: Faturamento */}
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className={isBlocked ? 'text-slate-400' : 'text-emerald-500'} />
                      <div className="text-sm">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Faturamento Pendente</p>
                        <p className={`font-bold leading-none ${isBlocked ? 'text-slate-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                          € {f.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        {totalBilledValor > 0 && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                            Já fat: € {totalBilledValor.toLocaleString('pt-PT', { maximumFractionDigits: 0 })} | Total: € {totalMonthValor.toLocaleString('pt-PT', { maximumFractionDigits: 0 })}
                          </p>
                        )}
                      </div>
                    </div>

                  </div>

                  <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    {/* Ações baseadas no status */}
                    {isBlocked ? (
                      validatedUnbilled > 0 ? (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (f.viesApplicable && !f.viesValid) {
                              toast.error('Faturamento Bloqueado: O VIES deste cliente está inválido ou pendente. Realize a consulta e validação no painel acima antes de prosseguir.');
                              return;
                            }
                            const validatedUnbilledWorkers = unbilledWorkersList.filter(w => w.isValidated);
                            handleSolicitarAprovacao(f.clientId, validatedUnbilledWorkers);
                          }}
                          disabled={isProcessing}
                          variant="outline"
                          size="sm"
                          className="border-blue-600 hover:bg-blue-50/50 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-medium gap-1.5 shrink-0"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <LinkIcon size={14} />
                          )}
                          Aprovação Parcial ({validatedUnbilled}/{totalUnbilled})
                        </Button>
                      ) : (
                        <Button 
                          disabled
                          variant="secondary"
                          size="sm"
                          className="bg-slate-100 text-slate-400 cursor-not-allowed font-medium shrink-0"
                        >
                          Aguardando Validação
                        </Button>
                      )
                    ) : f.statusBilling === 'ready' ? (
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (f.viesApplicable && !f.viesValid) {
                            toast.error('Faturamento Bloqueado: O VIES deste cliente está inválido ou pendente. Realize a consulta e validação no painel acima antes de prosseguir.');
                            return;
                          }
                          const validatedUnbilledWorkers = unbilledWorkersList.filter(w => w.isValidated);
                          handleSolicitarAprovacao(f.clientId, validatedUnbilledWorkers);
                        }}
                        disabled={isProcessing}
                        variant={f.viesApplicable && !f.viesValid ? "destructive" : "default"}
                        size="sm"
                        className={`shadow-sm font-medium gap-1.5 shrink-0 ${
                          f.viesApplicable && !f.viesValid
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LinkIcon size={14} />
                        )}
                        Solicitar Aprovação
                      </Button>
                    ) : f.statusBilling === 'invoiced_pending' ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          onClick={() => handleCopyLink(f.magicLinkToken)}
                          variant="outline"
                          size="sm"
                          className="border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-50 font-medium gap-1.5 shrink-0 dark:bg-amber-950/20 dark:text-amber-400"
                        >
                          <Copy size={14} />
                          Copiar Link
                        </Button>
                        <Button 
                          onClick={() => handleCancelFatura(f)}
                          variant="outline"
                          size="sm"
                          className="border-red-300 bg-red-50/50 text-red-700 hover:bg-red-100 font-medium gap-1.5 shrink-0 dark:bg-red-950/20 dark:text-red-400"
                        >
                          <Trash2 size={14} />
                          Cancelar / Resetar Fatura
                        </Button>
                      </div>
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
                    {/* Alerta de Validação VIES */}
                    {f.viesApplicable && !f.viesValid && (
                      <div className="mx-5 mt-4 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/15 border border-amber-250 dark:border-amber-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-200 shadow-sm">
                        <div className="flex gap-3">
                          <div className="p-2 bg-amber-100 dark:bg-amber-950/40 rounded-lg text-amber-700 dark:text-amber-400 shrink-0 self-start">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div>
                            <h5 className="text-sm font-bold text-amber-800 dark:text-amber-400">Validação VIES Intracomunitária Pendente</h5>
                            <p className="text-xs text-amber-700 dark:text-amber-500/90 mt-1 leading-relaxed">
                              Este cliente está cadastrado como intracomunitário (VIES Aplicável), mas o NIF/IVA <span className="font-extrabold underline">{f.taxId || 'Não Informado'}</span> não está ativo ou não foi validado no VIES europeu.
                              {f.viesLastCheckedAt ? (
                                <span className="block mt-1.5 font-medium text-[11px]">
                                  Última verificação: {new Date(f.viesLastCheckedAt).toLocaleString('pt-PT')} ({f.viesStatus === 'invalid' ? 'Rejeitado/Inválido' : 'Expirado/Necessita consulta'}).
                                </span>
                              ) : (
                                <span className="block mt-1.5 font-medium text-[11px] text-amber-600/90 dark:text-amber-500/80">
                                  Nenhuma verificação foi realizada para este cliente até o momento.
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckVies(f);
                          }}
                          disabled={checkingViesClient === f.clientId}
                          variant="outline"
                          size="sm"
                          className="h-9 shrink-0 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 font-bold text-xs gap-1.5 shadow-sm"
                        >
                          {checkingViesClient === f.clientId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Search className="h-3.5 w-3.5" />
                          )}
                          Validar no VIES Agora
                        </Button>
                      </div>
                    )}

                    {/* Obras Filter Cards */}
                    {f.obras && f.obras.some(o => o.id !== null) && (
                      <div className="p-5 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Filtrar e Faturar por Obra / Centro de Custo</span>
                        <div className="flex flex-wrap gap-3">
                          {/* Card "Todas as Obras" */}
                          <div 
                            onClick={() => setSelectedObraByClient(prev => {
                              const next = { ...prev };
                              delete next[cardId];
                              return next;
                            })}
                            className={`flex-1 min-w-[150px] max-w-[240px] p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] flex items-center justify-between gap-3 ${getObraColorClasses(-1, selectedObraByClient[cardId] === undefined)}`}
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold">Todas as Obras</span>
                              <span className="text-[10px] opacity-75 mt-0.5">{f.totalHoras.toFixed(2)} hrs</span>
                            </div>
                            <span className="font-extrabold text-sm">
                              € {f.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          {/* Cards for each Obra */}
                          {f.obras.map((obra, idx) => {
                            const isSelected = selectedObraByClient[cardId] === obra.id;
                            return (
                              <div 
                                key={obra.id || 'sem_obra'}
                                onClick={() => setSelectedObraByClient(prev => ({ ...prev, [cardId]: obra.id }))}
                                className={`flex-1 min-w-[150px] max-w-[240px] p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] flex items-center justify-between gap-3 ${getObraColorClasses(idx, isSelected)}`}
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold truncate" title={obra.name}>
                                    {obra.name}
                                  </span>
                                  <span className="text-[10px] opacity-75 mt-0.5">{obra.totalHoras.toFixed(2)} hrs</span>
                                </div>
                                <span className="font-extrabold text-sm shrink-0">
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
                        onClick={() => setActiveTab(cardId, 'edicao')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(cardId) === 'edicao' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Edição dos dados
                      </button>
                      <button 
                        onClick={() => setActiveTab(cardId, 'datas_trabalhadas')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(cardId) === 'datas_trabalhadas' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Datas trabalhadas
                      </button>
                      <button 
                        onClick={() => setActiveTab(cardId, 'importe')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(cardId) === 'importe' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Importe
                      </button>
                      <button 
                        onClick={() => setActiveTab(cardId, 'informe')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(cardId) === 'informe' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Informe
                      </button>
                      <button 
                        onClick={() => setActiveTab(cardId, 'factura')} 
                        className={`px-3 py-1.5 rounded-lg transition-colors ${getActiveTab(cardId) === 'factura' ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                      >
                        Factura Única
                      </button>
                    </div>

                    {/* Aba 1: Edição dos dados */}
                    {getActiveTab(cardId) === 'edicao' && (
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
                          {allWorkers.map(worker => {
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
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`font-semibold ${worker.isValidated ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}`}>
                                          {worker.workerName}
                                        </span>
                                        {worker.isException && (
                                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 h-4.5 font-bold uppercase tracking-wider shrink-0 border-0 shadow-sm rounded-md">
                                            Exceção
                                          </Badge>
                                        )}
                                      </div>
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
                                    {worker.isBilled ? (
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-medium py-0.5">
                                        Faturado
                                      </Badge>
                                    ) : worker.isValidated ? (
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
                                    {worker.isValidated || worker.isBilled ? `${(worker.totalHorasMes ?? worker.totalHoras).toFixed(2)}h` : '--'}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold align-top pt-4">
                                    {worker.isValidated || worker.isBilled ? (
                                      <div className="flex items-center justify-end gap-1.5 group/tarifa">
                                        <span className={worker.isException ? "text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-200/50" : ""}>
                                          € {worker.tarifa.toFixed(2)}
                                        </span>
                                        {!isAlreadyInvoiced && !worker.isBilled && (
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
                                    {worker.isValidated || worker.isBilled ? `€ ${(worker.totalValorMes ?? worker.totalValor).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
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
                                          {daysArray.map(dInfo => {
                                            const targetDateStr = dInfo.dateStr;
                                            const record = worker.horasDiarias[targetDateStr];
                                            const hoursVal = record ? Number(record.horas_totais) : 0;
                                            
                                            const date = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
                                            const dayOfWeek = date.getDay();
                                            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                            const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                                            const weekdayLabel = weekdays[dayOfWeek];

                                            return (
                                              <div 
                                                key={dInfo.dateStr} 
                                                className={`flex-1 flex flex-col items-center p-1.5 rounded-md min-w-[38px] max-w-[50px] transition-colors ${
                                                  isWeekend 
                                                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40' 
                                                    : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                                                }`}
                                              >
                                                <span className={`text-[10px] md:text-xs font-extrabold leading-none mb-1 ${isWeekend ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                  {String(dInfo.day).padStart(2, '0')}
                                                </span>
                                                <span className={`text-[8px] md:text-[9.5px] font-bold leading-normal mb-1.5 ${isWeekend ? 'text-amber-500/70' : 'text-slate-400/70'}`}>
                                                  {weekdayLabel}
                                                </span>
                                                <input
                                                  type="text"
                                                  disabled={!worker.isValidated || isAlreadyInvoiced || worker.isBilled}
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
                    {getActiveTab(cardId) === 'datas_trabalhadas' && (
                      <div className="p-6 bg-white dark:bg-slate-950 overflow-x-auto">
                        <div className="mb-6 flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Relatório de Horas</h4>
                              <Button 
                                onClick={() => handleExportHoursPDF(f)}
                                variant="outline" 
                                size="sm" 
                                className="h-8 border-indigo-200 bg-indigo-50/30 text-indigo-700 hover:bg-indigo-50 font-bold gap-1.5 text-[11px] py-1 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-indigo-400"
                              >
                                <Download size={12} />
                                Exportar PDF (Horizontal)
                              </Button>
                            </div>
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
                              {daysArray.map(dInfo => {
                                const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
                                const dayOfWeek = cellDate.getDay();
                                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                                const weekdayLabel = weekdays[dayOfWeek];

                                return (
                                  <TableHead 
                                    key={dInfo.dateStr} 
                                    className={`text-center p-1 min-w-[32px] max-w-[38px] transition-colors ${
                                      isWeekend 
                                        ? 'bg-amber-50/50 dark:bg-amber-950/20' 
                                        : ''
                                    }`}
                                  >
                                    <div className="flex flex-col items-center">
                                      <span className={`text-[10px] font-extrabold leading-none ${isWeekend ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {String(dInfo.day).padStart(2, '0')}
                                      </span>
                                      <span className={`text-[8px] font-bold leading-normal mt-0.5 ${isWeekend ? 'text-amber-500/70' : 'text-slate-400/70'}`}>
                                        {weekdayLabel}
                                      </span>
                                    </div>
                                  </TableHead>
                                );
                              })}
                              <TableHead className="text-right font-bold text-xs pr-4">TOTAL</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredWorkers.filter(worker => !worker.isBilled).map(worker => {
                              const workerTotal = Object.values(worker.horasDiarias).reduce((sum, h: any) => sum + Number(h?.horas_totais || 0), 0);
                              return (
                                <TableRow key={worker.workerId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                  <TableCell className="font-semibold text-xs text-slate-800 dark:text-slate-200 pl-4 py-3">{worker.workerName}</TableCell>
                                  {daysArray.map(dInfo => {
                                    const dateKey = dInfo.dateStr;
                                    const hourObj = worker.horasDiarias[dateKey] as any;
                                    const hoursVal = hourObj ? Number(hourObj.horas_totais || 0) : 0;
                                    
                                    const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
                                    const dayOfWeek = cellDate.getDay();
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                    return (
                                      <TableCell 
                                        key={dInfo.dateStr} 
                                        className={`text-center text-xs p-1 transition-colors ${
                                          isWeekend 
                                            ? 'bg-amber-50/15 dark:bg-amber-950/5 border-x border-x-amber-100/20 dark:border-x-amber-900/10' 
                                            : ''
                                        } ${
                                          hoursVal > 0 
                                            ? isWeekend 
                                              ? 'font-bold text-amber-700 dark:text-amber-400'
                                              : 'font-bold text-blue-600 dark:text-blue-400' 
                                            : 'text-slate-300 dark:text-slate-700'
                                        }`}
                                      >
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
                    {getActiveTab(cardId) === 'importe' && (() => {
                      const adj = clientAdjustments[cardId] || initAdjustments(f);
                      const handleFieldChange = (field: keyof ClientAdjustments, val: any) => {
                        setClientAdjustments(prev => {
                          const current = prev[cardId] || initAdjustments(f);
                          const updated = { ...current, [field]: val };
                          
                          if (field === 'dataEmissao' || field === 'condicoesPagamento') {
                            const days = f.paymentTermDays ?? 0;
                            const emissionDate = new Date(updated.dataEmissao + 'T00:00:00');
                            const dueDate = new Date(emissionDate.getTime());
                            dueDate.setDate(emissionDate.getDate() + days);
                            updated.dataVencimento = dueDate.toISOString().split('T')[0];
                          }
                          return { ...prev, [cardId]: updated };
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

                            {totalBilledHours > 0 && (
                              <div className="mt-4 p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900 space-y-2">
                                <h5 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText size={14} /> Resumo do Ciclo de Faturamento
                                </h5>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                  <div>
                                    <p className="text-slate-400 font-medium">Faturamento Total do Ciclo</p>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                                      € {totalMonthValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">({totalMonthHours.toFixed(1)}h)</span>
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-slate-400 font-medium">Já Faturado (Parcial)</p>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                                      € {totalBilledValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">({totalBilledHours.toFixed(1)}h)</span>
                                    </p>
                                  </div>
                                  <div className="col-span-2 pt-1.5 border-t border-indigo-100/50 dark:border-indigo-900/40">
                                    <p className="text-slate-400 font-medium">Pendente a Faturar (Nesta Fatura)</p>
                                    <p className="font-extrabold text-emerald-600 dark:text-emerald-500 mt-0.5">
                                      € {totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-500 font-normal">({f.totalHoras.toFixed(1)}h)</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="pt-2 flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
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

                    {/* Aba 4: Informe Pró-forma */}
                    {(() => {
                      const adj = clientAdjustments[cardId] || initAdjustments(f);
                      const totalBase = displayTotalValor;
                      const finalTotal = (totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);
                      const periodStr = `${getMonthName(f.month)} / ${f.year}`;

                      return (
                        <div className={getActiveTab(cardId) === 'informe' ? 'p-8 bg-slate-100 dark:bg-slate-950/40 flex flex-col items-center gap-4' : 'hidden'}>
                          <div className="w-full max-w-[800px] flex justify-end">
                            <Button 
                              onClick={() => handleExportA4PDF(cardId, f.clientName, 'informe')}
                              variant="default"
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
                            >
                              <Download size={14} />
                              Baixar Informe (PDF)
                            </Button>
                          </div>
                          {/* Folha A4 simulada */}
                          <div id={`informe-sheet-${cardId}`} className="w-full max-w-[800px] bg-white dark:bg-slate-900 p-8 shadow-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded text-left">
                            {/* Header */}
                            <div className="flex justify-between items-start border-b-2 border-slate-100 dark:border-slate-800 pb-6 mb-6">
                              <div className="space-y-2">
                                {f.empresaInvoiceLogoUrl ? (
                                  <div className="h-14 flex items-center mb-2">
                                    <img src={f.empresaInvoiceLogoUrl} alt={f.empresaNome} className="max-h-full max-w-[220px] object-contain" />
                                  </div>
                                ) : (
                                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                                    {f.empresaNome.toUpperCase()}
                                  </h3>
                                )}
                                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Informe de Facturación</p>
                                <p className="text-[10px] text-muted-foreground">MCS - Gestão Comercial</p>
                              </div>
                              <div className="text-right text-xs space-y-1">
                                <p className="font-bold text-slate-500 uppercase text-[10px]">Documento</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">IF-{f.year}/{String(f.faturaNumero || f.empresaNextInvoiceNumber || '0001').padStart(4, '0')}</p>
                                <p className="text-muted-foreground mt-2">Emissão: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(adj.dataEmissao + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                                <p className="text-muted-foreground">Vencimento: <span className="font-semibold text-slate-700 dark:text-slate-300">{new Date(adj.dataVencimento + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                              </div>
                            </div>

                            {/* Emissor e Cliente */}
                            <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-900 space-y-1">
                                <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Emissor</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{f.empresaNome}</p>
                                <p className="text-muted-foreground">NIF: {f.empresaTaxId || 'N/A'}</p>
                                <p className="text-muted-foreground">{f.empresaAddressLine || 'N/A'}</p>
                                <p className="text-muted-foreground">{[f.empresaPostalCode, f.empresaCity].filter(Boolean).join(' ')}</p>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-100 dark:border-slate-900 space-y-1">
                                <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Cliente</p>
                                <p className="font-bold text-slate-900 dark:text-slate-100">{f.clientName}</p>
                                <p className="text-muted-foreground">NIF: {f.taxId || 'N/A'}</p>
                                <p className="text-muted-foreground">{f.clientAddressLine || 'N/A'}</p>
                                <p className="text-muted-foreground">{[f.clientPostalCode, f.clientCity, f.clientCountryName].filter(Boolean).join(', ')}</p>
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
                                {filteredWorkers.filter(w => !w.isBilled).map(w => (
                                  <TableRow key={w.workerId}>
                                    <TableCell className="font-semibold text-slate-800 dark:text-slate-200 pl-4">
                                      <div className="flex items-center justify-between w-full">
                                        <span>{w.workerName}</span>
                                        {w.isException && (
                                          <span className="text-[8px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-1 py-0.5 rounded uppercase tracking-wider">
                                            Tarifa Especial
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{w.totalHoras.toFixed(2)}h</TableCell>
                                    <TableCell className={`text-right font-medium ${w.isException ? 'text-amber-600 dark:text-amber-400 font-bold' : ''}`}>
                                      € {w.tarifa.toFixed(2)}
                                    </TableCell>
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
                    {(() => {
                      const adj = clientAdjustments[cardId] || initAdjustments(f);
                      const totalBase = displayTotalValor;
                      const finalTotal = (totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * (1 + Number(adj.ivaPct || 0)/100);

                      return (
                        <div className={getActiveTab(cardId) === 'factura' ? 'p-8 bg-slate-100 dark:bg-slate-950/40 flex flex-col items-center gap-4' : 'hidden'}>
                          <div className="w-full max-w-[800px] flex justify-end">
                            <Button 
                              onClick={() => handleExportA4PDF(cardId, f.clientName, 'factura')}
                              variant="default"
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1.5 shadow-sm"
                            >
                              <Download size={14} />
                              Baixar Fatura Pró-forma (PDF)
                            </Button>
                          </div>
                          {/* Folha A4 da Fatura */}
                          <div id={`factura-sheet-${cardId}`} className="w-full max-w-[800px] h-[1130px] bg-white p-8 pb-20 border border-slate-200 text-slate-800 rounded text-left relative flex flex-col justify-between select-none shadow-md">
                            
                            {/* Wrapper do conteúdo flex-1 */}
                            <div className="flex-1">
                              {selectedObra && (
                                <div className="text-center font-bold text-xs bg-slate-100 py-1 rounded text-slate-700 mb-6">
                                  OBRA: {selectedObra.name.toUpperCase()}
                                </div>
                              )}

                              {/* Top row */}
                              <div className="flex justify-between items-start mb-8">
                                <div>
                                  <h3 className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                                    {f.faturaNumero || `Factura nº${f.empresaInvoiceSeries || '1'} ${new Date().getFullYear()}/${f.empresaNextInvoiceNumber || 1}`}
                                  </h3>
                                  <p className="text-xs font-bold text-slate-950 mt-1 uppercase tracking-wider">ORIGINAL</p>
                                </div>
                                {/* QR Code dinâmico */}
                                <div className="flex flex-col items-end gap-1.5">
                                  <span className="text-[9px] font-bold text-slate-700 font-sans">
                                    ATCUD: {f.atcud || `${f.empresaAtcudPrefix || 'J6XBVVRV'}-${f.empresaNextInvoiceNumber || 1}`}
                                  </span>
                                  <div className="border border-slate-200 p-1.5 bg-white rounded shadow-sm">
                                    <QRCodeSVG
                                      value={`${window.location.origin}/aprovacao-cliente/${f.magicLinkToken || 'draft'}`}
                                      size={90}
                                      level="H"
                                      includeMargin={false}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* De / Para / Detalhes (3 Colunas) */}
                              <div className="grid grid-cols-3 gap-6 mb-8 text-[11px] leading-relaxed border-t border-slate-100 pt-4">
                                {/* Coluna 1: De */}
                                <div>
                                  <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mb-1">De</p>
                                  <p className="font-bold text-slate-900">{f.empresaNome}</p>
                                  <p className="text-slate-600">{f.empresaAddressLine || 'N/A'}</p>
                                  <p className="text-slate-600">{[f.empresaPostalCode, f.empresaCity].filter(Boolean).join(' ')}</p>
                                  <p className="text-slate-600">{f.empresaProvince || 'Portugal'}</p>
                                  {f.empresaEmail && <p className="text-slate-600">{f.empresaEmail}</p>}
                                  <p className="text-slate-600">Nº Contribuinte: {f.empresaTaxId || 'N/A'}</p>
                                  {f.empresaCapitalSocial && <p className="text-slate-600">Capital Social: {f.empresaCapitalSocial}</p>}
                                  {f.empresaConservatoria && <p className="text-slate-600">Cons. Reg. Com.: {f.empresaConservatoria}</p>}
                                  {f.empresaMatricula && <p className="text-slate-600">Matrícula: {f.empresaMatricula}</p>}
                                </div>

                                {/* Coluna 2: Detalhes */}
                                <div>
                                  <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mb-1">ATCUD</p>
                                  <p className="font-semibold text-slate-900">{f.atcud || `${f.empresaAtcudPrefix || 'J6XBVVRV'}-${f.empresaNextInvoiceNumber || 1}`}</p>
                                  
                                  <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mt-3">Data de Emissão</p>
                                  <p className="text-slate-700">{new Date(adj.dataEmissao + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                                  
                                  <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mt-3">Data de Vencimento</p>
                                  <p className="text-slate-700">{new Date(adj.dataVencimento + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                                </div>
                                                         
                                {/* Coluna 3: Para */}
                                <div>
                                  <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mb-1">Para</p>
                                  <p className="font-bold text-slate-900">{f.clientName}</p>
                                  <p className="text-slate-600">{f.clientAddressLine || 'N/A'}</p>
                                  <p className="text-slate-600">{[f.clientPostalCode, f.clientCity].filter(Boolean).join(' ')}</p>
                                  <p className="text-slate-600">{f.clientCountryName || 'Espanha'}</p>
                                  <p className="text-slate-600 mt-2">Nº Contribuinte: {f.taxId || 'N/A'}</p>
                                </div>
                              </div>

                              {/* Tabela de Itens (Coral Accent) */}
                              <div className="bg-[#ec8a5e] text-white font-bold text-xs uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0">
                                Lista de Artigos
                              </div>
                              <table className="w-full border-collapse border border-[#ec8a5e]/40 rounded-b text-[11px] mb-6">
                                <thead>
                                  <tr className="bg-[#f2a87a] text-white border-b border-[#ec8a5e]/40">
                                    <th className="font-bold text-white pl-3 py-1 text-left">DESCRIÇÃO DO ARTIGO</th>
                                    <th className="text-right font-bold text-white w-20 py-1">QUANT.</th>
                                    <th className="text-right font-bold text-white w-24 py-1">PREÇO</th>
                                    <th className="text-right font-bold text-white w-16 py-1">DESC.</th>
                                    <th className="text-right font-bold text-white w-20 py-1">IVA (%)</th>
                                    <th className="text-right font-bold text-white w-24 pr-3 py-1">TOTAL</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-[#ec8a5e]/30">
                                    <td className="pl-3 py-1 text-slate-800">{adj.descricaoServico || 'Prestação de Serviços'}</td>
                                    <td className="text-right py-1 text-slate-800">{displayTotalHoras.toFixed(2)}</td>
                                    <td className="text-right py-1 text-slate-800">{(totalBase / (displayTotalHoras || 1)).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="text-right py-1 text-slate-800">0,00</td>
                                    <td className="text-right py-1 text-slate-800">{Number(adj.ivaPct || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
                                    <td className="text-right font-bold pr-3 font-mono py-1 text-slate-900">{totalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>
                                  {Number(adj.incrementos) > 0 && (
                                    <tr className="border-b border-[#ec8a5e]/30 text-emerald-700">
                                      <td className="pl-3 py-1">{adj.incrementosDesc || 'Incremento Adicional'}</td>
                                      <td className="text-right py-1">1.00</td>
                                      <td className="text-right py-1">{Number(adj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="text-right py-1">0,00</td>
                                      <td className="text-right py-1">{Number(adj.ivaPct || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
                                      <td className="text-right font-bold pr-3 font-mono py-1">{Number(adj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                  )}
                                  {Number(adj.reducoes) > 0 && (
                                    <tr className="border-b border-[#ec8a5e]/30 text-rose-700">
                                      <td className="pl-3 py-1">{adj.reducoesDesc || 'Redução Comercial'}</td>
                                      <td className="text-right py-1">1.00</td>
                                      <td className="text-right py-1">-{Number(adj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="text-right py-1">0,00</td>
                                      <td className="text-right py-1">{Number(adj.ivaPct || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
                                      <td className="text-right font-bold pr-3 font-mono py-1">-{Number(adj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>

                              {/* Resumo da Fatura (Coral Accent) */}
                              <div className="bg-[#ec8a5e] text-white font-bold text-xs uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0">
                                Resumo
                              </div>
                              <table className="w-full border-collapse border border-[#ec8a5e]/40 rounded-b text-[11px] mb-6">
                                <tbody>
                                  <tr className="border-b border-[#ec8a5e]/30">
                                    <td className="pl-3 py-1 text-slate-800" colSpan={3}>Subtotal da Factura</td>
                                    <td className="text-right font-medium w-40 pr-3 font-mono py-1 text-slate-800">{(totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</td>
                                  </tr>
                                  <tr className="border-b border-[#ec8a5e]/30">
                                    <td className="pl-3 py-1 text-slate-800" colSpan={3}>IVA {Number(adj.ivaPct || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}% (Incidência: {(totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })})</td>
                                    <td className="text-right font-medium w-40 pr-3 font-mono py-1 text-slate-800">{((totalBase + Number(adj.incrementos || 0) - Number(adj.reducoes || 0)) * Number(adj.ivaPct || 0)/100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</td>
                                  </tr>
                                  <tr className="border-b border-[#ec8a5e]/40">
                                    <td className="font-extrabold text-slate-900 pl-3 py-1.5 text-xs" colSpan={3}>Total da Factura</td>
                                    <td className="text-right font-extrabold text-slate-900 text-xs pr-3 font-mono py-1.5">
                                      {finalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €
                                    </td>
                                  </tr>
                                </tbody>
                              </table>

                              {/* Condições de IVA */}
                              <div className="text-[10px] text-slate-500 mb-6 font-semibold">
                                Condições de Enquadramento de IVA:<br/>
                                (1) {adj.ivaPct === 0 ? 'M40-IVA - autoliquidação' : 'Regime Geral'}
                              </div>
                            </div>

                            {/* Seção inferior empurrada para baixo */}
                            <div className="space-y-4">
                              {/* Certified software text */}
                              <div className="text-center text-[10px] text-slate-700 italic font-semibold">
                                {f.empresaCertifiedSoftwareText || 'Dclm - Processado por Programa Certificado nº 1137/AT'}
                              </div>

                              {/* Rodapé de moradas e contas */}
                              <div className="border-t border-slate-200 pt-3 flex justify-between text-[9px] text-slate-500 font-medium">
                                <div>
                                  <p className="font-bold uppercase mb-0.5">Local de Carga</p>
                                  <p>{f.empresaAddressLine || 'N/ Morada'}</p>
                                  <p>{[f.empresaPostalCode, f.empresaCity].filter(Boolean).join(' ')}</p>
                                </div>
                                {adj.iban && (
                                  <div className="text-center">
                                    <p className="font-bold uppercase mb-0.5">Informações de Pagamento</p>
                                    <div className="font-mono text-[9px] whitespace-pre-line leading-tight">{adj.iban}</div>
                                  </div>
                                )}
                                <div className="text-right">
                                  <p className="font-bold uppercase mb-0.5">Local de Descarga</p>
                                  <p>{f.clientAddressLine || 'V/ Morada'}</p>
                                  <p>{[f.clientPostalCode, f.clientCity, f.clientCountryName].filter(Boolean).join(', ')}</p>
                                </div>
                              </div>
                            </div>

                            {/* Barra preta com logotipo decorativo no canto inferior esquerdo */}
                            <div className="absolute bottom-0 left-0 right-0 h-[45px] bg-[#1a1a1a] text-slate-300 flex items-center justify-between px-10 text-[9px] font-sans rounded-b select-none overflow-hidden">
                              {/* Decoração laranja no canto inferior esquerdo */}
                              <div className="absolute left-0 bottom-0 top-0 w-24 bg-gradient-to-r from-orange-500 to-transparent opacity-20 skew-x-12 transform origin-bottom-left"></div>
                              <span className="relative z-10 font-medium">
                                Produzido por weoInvoice - Sistema de Facturação Online Gratuito - www.weoinvoice.com
                              </span>
                              <span className="relative z-10 font-bold">
                                Pág. 1/1
                              </span>
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

            const currentAdj = clientAdjustments[emailData.cardId] || initAdjustments(currentFaturamento);
            const currentTotalBase = emailData.totalBase;
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
                  
                  {currentFaturamento.viesApplicable && !currentFaturamento.viesValid && (
                    <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200 dark:border-rose-900/40 rounded-xl flex gap-2.5 text-rose-800 dark:text-rose-450 font-medium">
                      <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="leading-relaxed font-normal">
                        <span className="font-extrabold text-[11px] uppercase tracking-wider block text-rose-800 dark:text-rose-400 mb-0.5">Risco Fiscal: VIES Pendente / Inválido</span>
                        Este cliente está configurado como faturamento intracomunitário (com isenção de IVA), mas seu cadastro VIES está **inválido** ou **não verificado**. Faturar sem cobrar IVA sob estas condições pode gerar multas e autuações tributárias.
                      </div>
                    </div>
                  )}

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
                      {/* Idioma do E-mail */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Idioma do E-mail</label>
                        <Select 
                          value={emailLanguage} 
                          onValueChange={(val: 'pt' | 'es' | 'en') => handleLanguageChange(val)}
                        >
                          <SelectTrigger className="h-9 text-xs dark:bg-slate-950 dark:border-slate-800 font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Selecione o idioma" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pt" className="text-xs font-semibold">🇵🇹 Português (Padrão)</SelectItem>
                            <SelectItem value="es" className="text-xs font-semibold">🇪🇸 Espanhol (Spanish)</SelectItem>
                            <SelectItem value="en" className="text-xs font-semibold">🇬🇧 Inglês (English)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

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
