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
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getBillingCycleDays } from './FaturasPendentes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QRCodeSVG } from 'qrcode.react';


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

  const [pdfRenderData, setPdfRenderData] = useState<{ fatura: any, hours: any[], type: 'informe' | 'factura' } | null>(null);

  // Effect to handle dynamic PDF generation in the background
  useEffect(() => {
    if (!pdfRenderData) return;
    
    const timer = setTimeout(async () => {
      const elementId = `pdf-render-${pdfRenderData.type}-sheet-${pdfRenderData.fatura.id}`;
      const element = document.getElementById(elementId);
      if (!element) {
        toast.error('Erro ao localizar o elemento visual para geração do PDF.');
        setPdfRenderData(null);
        return;
      }
      
      const toastId = toast.loading(`Gerando PDF do ${pdfRenderData.type === 'informe' ? 'Informe de Facturación' : 'Fatura Pró-forma'}...`);
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        
        const clientName = pdfRenderData.fatura.client?.nombre_comercial || 'cliente';
        const filename = `${pdfRenderData.type}-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        pdf.save(filename);
        toast.success(`PDF gerado com sucesso!`, { id: toastId });
      } catch (err: any) {
        console.error('Erro ao gerar PDF em background:', err);
        toast.error('Erro ao gerar PDF: ' + err.message, { id: toastId });
      } finally {
        setPdfRenderData(null);
      }
    }, 400); // 400ms delay to let React fully render the sheet in the DOM
    
    return () => clearTimeout(timer);
  }, [pdfRenderData]);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState('');
  const [sendEmailCheckbox, setSendEmailCheckbox] = useState(true);
  const [emailLanguage, setEmailLanguage] = useState<'pt' | 'es' | 'en'>('pt');

  const [emailCache, setEmailCache] = useState<Record<string, {
    selectedEmails: string[];
    additionalEmails: string;
    sendEmailCheckbox: boolean;
    emailLanguage: 'pt' | 'es' | 'en';
    subject: string;
    body: string;
  }>>({});

  const updateEmailCache = (faturaId: string, updates: Partial<{
    selectedEmails: string[];
    additionalEmails: string;
    sendEmailCheckbox: boolean;
    emailLanguage: 'pt' | 'es' | 'en';
    subject: string;
    body: string;
  }>) => {
    setEmailCache(prev => {
      const current = prev[faturaId] || {
        selectedEmails: [],
        additionalEmails: '',
        sendEmailCheckbox: true,
        emailLanguage: 'pt',
        subject: '',
        body: ''
      };
      return {
        ...prev,
        [faturaId]: {
          ...current,
          ...updates
        }
      };
    });
  };
  const [isEmailAcceptance, setIsEmailAcceptance] = useState<boolean>(false);
  const [currentEmailFatura, setCurrentEmailFatura] = useState<any | null>(null);
  const [emailHours, setEmailHours] = useState<any[]>([]);

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
    fatura: any;
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

  const handleExportA4PDFTracking = async (faturaId: string, clientName: string, type: 'informe' | 'factura') => {
    // 1. Try to find the element in the DOM (e.g. if the details modal is open and active)
    const elementId = `${type}-sheet-${faturaId}`;
    const element = document.getElementById(elementId);
    
    if (element) {
      toast.info(`Aguarde, gerando PDF do ${type === 'informe' ? 'Informe de Facturación' : 'Fatura Pró-forma'}...`);
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        
        const filename = `${type}-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        pdf.save(filename);
        toast.success(`PDF do ${type === 'informe' ? 'Informe' : 'Pro-forma'} gerado com sucesso!`);
      } catch (error: any) {
        console.error("Erro ao gerar PDF:", error);
        toast.error("Erro ao gerar o arquivo PDF: " + error.message);
      }
      return;
    }

    // 2. If not found in the DOM, fetch the fatura data and hours dynamically!
    const toastId = toast.loading(`Buscando dados da fatura para gerar o PDF...`);
    try {
      // Find fatura in current list or search cache
      let targetFatura = faturas.find(f => f.id === faturaId);
      if (!targetFatura && selectedDispute?.id === faturaId) {
        targetFatura = selectedDispute;
      }
      
      if (!targetFatura) {
        // Fetch fatura metadata
        const { data: fatData, error: fatError } = await supabase
          .schema('core_finance')
          .from('faturas')
          .select('*')
          .eq('id', faturaId)
          .single();
        if (fatError) throw fatError;
        targetFatura = fatData;
      }

      // Fetch client if not enriched
      if (targetFatura && !targetFatura.client) {
        const { data: clData } = await supabase
          .schema('core_common')
          .from('clients')
          .select('id, trade_name, tax_id, address_line, postal_code, city, province')
          .eq('id', targetFatura.client_id)
          .single();
        if (clData) {
          targetFatura = {
            ...targetFatura,
            client: {
              nombre_comercial: clData.trade_name,
              taxId: clData.tax_id,
              address_line: clData.address_line,
              postal_code: clData.postal_code,
              city: clData.city,
              province: clData.province
            }
          };
        }
      }

      // Fetch hours using the paginated helper to avoid truncation
      const hoursData = await fetchAllPages(async (from, to) => {
        return supabase
          .schema('core_finance')
          .from('horas_trabalhadas')
          .select('*')
          .eq('fatura_id', faturaId)
          .range(from, to);
      });

      const workerIds = Array.from(new Set((hoursData || []).map((h: any) => h.worker_id).filter(Boolean)));
      let workersMap = new Map();
      if (workerIds.length > 0) {
        const { data: wData } = await supabase
          .schema('core_personal')
          .from('workers')
          .select('id, nome')
          .in('id', workerIds);
        workersMap = new Map((wData || []).map(w => [w.id, w]));
      }
      
      const mappedHours = (hoursData || []).map(h => ({
        ...h,
        worker: workersMap.get(h.worker_id)
      }));

      toast.dismiss(toastId);
      setPdfRenderData({
        fatura: targetFatura,
        hours: mappedHours,
        type
      });
    } catch (err: any) {
      console.error(err);
      toast.dismiss(toastId);
      toast.error('Erro ao buscar dados para o PDF: ' + err.message);
    }
  };

  const handleExportHoursPDFTracking = async (fatura: any) => {
    toast.info("Aguarde, gerando PDF do Relatório de Horas...");
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1120px';
    container.style.padding = '40px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    
    const clientName = fatura.client?.nombre_comercial || 'Cliente';
    
    let disputeYear = new Date().getFullYear();
    let disputeMonth = new Date().getMonth();
    if (disputeHours && disputeHours.length > 0) {
      const parts = disputeHours[0].data_trabalho.split('-');
      disputeYear = parseInt(parts[0]);
      disputeMonth = parseInt(parts[1]) - 1;
    }
    
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const periodStr = `${months[disputeMonth]} / ${disputeYear}`;
    
    const totalHorasCalculadas = disputeHours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
    const totalValorCalculado = disputeHours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 0)), 0);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #1e293b;">Relatório de Horas</h2>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">Cliente: <strong>${clientName}</strong> | Período: <strong>${periodStr}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 13px; color: #64748b; margin: 0;">Total de Horas: <strong style="color: #1e293b; font-size: 16px;">${totalHorasCalculadas.toFixed(2)}h</strong></p>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">Faturamento Base: <strong style="color: #1e293b; font-size: 16px;">€ ${totalValorCalculado.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        </div>
      </div>
    `;

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
      const dateKey = h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho;
      wObj.horasDiarias[dateKey] = h.horas_totais;
    });

    const groupedWorkers = Array.from(workersMap.values());
    const cycleStartDay = fatura.client?.billing_cycle_start_day || 1;
    const daysArray = getBillingCycleDays(cycleStartDay, disputeYear, disputeMonth);

    let tableHtml = `
      <div style="margin-bottom: 40px; page-break-inside: avoid;">
        <div style="text-align: center; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; background-color: #f1f5f9; padding: 10px; color: #334155; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
          OBRA: TODAS AS OBRAS
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left; font-weight: 700; color: #475569; border-right: 1px solid #e2e8f0;">Trabalhador</th>
    `;

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

    groupedWorkers.forEach(w => {
      const workerTotal = daysArray.reduce((sum, dInfo) => sum + (w.horasDiarias[dInfo.dateStr] || 0), 0);
      tableHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0; white-space: nowrap;">${w.workerName}</td>
      `;

      daysArray.forEach(dInfo => {
        const hoursVal = w.horasDiarias[dInfo.dateStr] || 0;
        
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

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
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
      
      pdf.save(`relatorio-horas-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success("PDF do Relatório de Horas gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o arquivo PDF: " + error.message);
    } finally {
      document.body.removeChild(container);
    }
  };

  const generatePDFAttachmentTracking = async (faturaId: string, clientName: string, type: 'informe' | 'factura'): Promise<{ name: string, contentType: string, contentBytes: string } | null> => {
    const elementId = `${type}-sheet-tracking-${faturaId}`;
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

  const generateHoursPDFAttachmentTracking = async (fatura: any, hours: any[], lang: 'pt' | 'es' | 'en'): Promise<{ name: string, contentType: string, contentBytes: string } | null> => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1120px';
    container.style.padding = '40px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    
    const clientName = fatura.client?.nombre_comercial || 'Cliente';
    
    const getTranslatedMonth = (mIndex: number, l: string) => {
      const ptMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const esMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      if (l === 'es') return esMonths[mIndex] || '';
      if (l === 'en') return enMonths[mIndex] || '';
      return ptMonths[mIndex] || '';
    };

    const periodMonth = fatura.created_at ? new Date(fatura.created_at).getMonth() : new Date().getMonth();
    const periodYear = fatura.created_at ? new Date(fatura.created_at).getFullYear() : new Date().getFullYear();
    const monthStr = getTranslatedMonth(periodMonth, lang);
    const periodStr = lang === 'en' ? `${monthStr} ${periodYear}` : `${monthStr} de ${periodYear}`;
    
    const labels = {
      title: lang === 'pt' ? 'Relatório de Horas' : lang === 'es' ? 'Informe de Horas' : 'Timesheet Report',
      client: lang === 'pt' ? 'Cliente' : lang === 'es' ? 'Cliente' : 'Client',
      period: lang === 'pt' ? 'Período' : lang === 'es' ? 'Período' : 'Period',
      totalHours: lang === 'pt' ? 'Total de Horas' : lang === 'es' ? 'Total de Horas' : 'Total Hours',
      baseBilling: lang === 'pt' ? 'Faturamento Base' : lang === 'es' ? 'Facturación Base' : 'Base Billing',
      worker: lang === 'pt' ? 'Trabalhador' : lang === 'es' ? 'Trabajador' : 'Worker'
    };

    const totalHorasVal = hours.reduce((sum, h) => sum + Number(h.horas_totais || 0), 0);
    const totalTarifaVal = hours.reduce((sum, h) => sum + (Number(h.horas_totais || 0) * Number(h.tarifa_faturada || 27.00)), 0);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #1e293b;">${labels.title}</h2>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">${labels.client}: <strong>${clientName}</strong> | ${labels.period}: <strong>${periodStr}</strong></p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 13px; color: #64748b; margin: 0;">${labels.totalHours}: <strong style="color: #1e293b; font-size: 16px;">${totalHorasVal.toFixed(2)}h</strong></p>
          <p style="font-size: 13px; color: #64748b; margin: 5px 0 0 0;">${labels.baseBilling}: <strong style="color: #1e293b; font-size: 16px;">€ ${totalTarifaVal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        </div>
      </div>
    `;

    const workersMap = new Map<string, {
      workerId: string;
      workerName: string;
      horasDiarias: Record<string, number>;
    }>();

    hours.forEach(h => {
      const wId = h.worker_id;
      if (!wId) return;
      if (!workersMap.has(wId)) {
        workersMap.set(wId, {
          workerId: wId,
          workerName: h.worker?.nombrecompleto || h.worker?.nome || 'Colaborador',
          horasDiarias: {}
        });
      }
      const wObj = workersMap.get(wId)!;
      const dateKey = h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho;
      wObj.horasDiarias[dateKey] = h.horas_totais;
    });

    const groupedWorkers = Array.from(workersMap.values());
    const cycleStartDay = fatura.client?.billingCycleStartDay || fatura.client?.billing_cycle_start_day || 1;
    const daysArray = getBillingCycleDays(cycleStartDay, periodYear, periodMonth);

    let tableHtml = `
      <div style="margin-bottom: 40px; page-break-inside: avoid;">
        <div style="text-align: center; font-weight: 800; font-size: 14px; letter-spacing: 0.05em; background-color: #f1f5f9; padding: 10px; color: #334155; border-radius: 6px; margin-bottom: 15px; border: 1px solid #e2e8f0;">
          OBRA: TODAS AS OBRAS
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
      const weekdays = lang === 'pt' ? ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] : lang === 'es' ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

    groupedWorkers.forEach(w => {
      const workerTotal = daysArray.reduce((sum, dInfo) => sum + (w.horasDiarias[dInfo.dateStr] || 0), 0);
      tableHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0; white-space: nowrap;">${w.workerName}</td>
      `;

      daysArray.forEach(dInfo => {
        const hoursVal = w.horasDiarias[dInfo.dateStr] || 0;
        
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
      return {
        name: 'Relatorio_Datas_Trabalhadas.pdf',
        contentType: 'application/pdf',
        contentBytes: pdfBase64
      };
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      return null;
    } finally {
      document.body.removeChild(container);
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

  const generateEmailContent = (fatura: any, isAcceptance: boolean, lang: 'pt' | 'es' | 'en') => {
    const periodMonth = fatura.created_at ? new Date(fatura.created_at).getMonth() : new Date().getMonth();
    const periodYear = fatura.created_at ? new Date(fatura.created_at).getFullYear() : new Date().getFullYear();
    
    const getTranslatedMonth = (mIndex: number, l: string) => {
      const ptMonths = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const esMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      
      if (l === 'es') return esMonths[mIndex] || '';
      if (l === 'en') return enMonths[mIndex] || '';
      return ptMonths[mIndex] || '';
    };

    const monthStr = getTranslatedMonth(periodMonth, lang);
    const periodStr = lang === 'en' ? `${monthStr} ${periodYear}` : `${monthStr} de ${periodYear}`;
    
    const adj = fatura.ajustes_json || {};
    const incrementos = Number(adj.incrementos || 0);
    const reducoes = Number(adj.reducoes || 0);
    const ivaPct = Number(adj.iva_pct || 0);
    const finalTotal = (fatura.total_valor + incrementos - reducoes) * (1 + ivaPct / 100);

    const clientName = fatura.client?.nombre_comercial || fatura.client?.trade_name || fatura.client?.legal_name || 'Cliente';
    const docNumber = fatura.fatura_numero || fatura.atcud || `IF-${periodYear}/0001`;
    const link = `${window.location.origin}/aprovacao-cliente/${fatura.magic_link_token}`;

    let subject = '';
    let body = '';

    if (isAcceptance) {
      if (lang === 'es') {
        subject = `MCS - Envío de Factura y Registro de Horas - ${clientName} - ${periodStr}`;
        body = `Estimado cliente,

Muchas gracias por su aprobación. Adjunto a este correo encontrará la factura oficial, el archivo pro-forma y el registro de horas del faturamento correspondiente al mes de ${periodStr}.

Si tiene alguna duda o necesita soporte, póngase en contacto respondiendo a este correo.

Atentamente,
MCS - Gestión Comercial`;
      } else if (lang === 'en') {
        subject = `MCS - Invoice & Timesheet Delivery - ${clientName} - ${periodStr}`;
        body = `Dear Customer,

Thank you for your approval. Attached to this email you will find the official invoice, the pro-forma file, and the detailed timesheet report for the billing period of ${periodStr}.

If you have any questions or require support, please contact us by replying to this email.

Best regards,
MCS - Commercial Management`;
      } else {
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
    } else {
      if (lang === 'es') {
        subject = `MCS - Solicitud de Aprobación de Horas - ${clientName} - ${periodStr}`;
        body = `Estimado cliente,

Le solicitamos su aprobación para el informe de facturación correspondiente al período de ${periodStr}.

Adjunto a este correo encontrará los siguientes documentos para su análisis:
1. Informe de Facturación (${docNumber})
2. Control de presencia detalhado con las fechas trabajadas
3. Factura Pro-forma correspondiente por el valor de € ${finalTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Por favor, utilice el siguiente enlace para visualizar los documentos de forma interactiva y aprobar o disputar las horas:
${link}

Si tiene alguna duda, póngase en contacto respondiendo a este correo.

Atentamente,
MCS - Gestión Comercial`;
      } else if (lang === 'en') {
        subject = `MCS - Timesheet Approval Request - ${clientName} - ${periodStr}`;
        body = `Dear Customer,

We would like to request your approval for the billing report corresponding to the period of ${periodStr}.

Attached to this email you will find the following documents for your analysis:
1. Billing Report (${docNumber})
2. Detailed timesheet with dates worked
3. Corresponding Pro-forma Invoice in the amount of € ${finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

Please use the link below to view the documents interactively and approve or dispute the hours:
${link}

If you have any questions, please contact us by replying to this email.

Best regards,
MCS - Commercial Management`;
      } else {
        subject = `MCS - Solicitação de Aprovação de Horas - ${clientName} - ${periodStr}`;
        body = `Olá,

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
      }
    }

    return { subject, body };
  };

  const handleLanguageChange = (lang: 'pt' | 'es' | 'en') => {
    setEmailLanguage(lang);
    if (currentEmailFatura) {
      const { subject, body } = generateEmailContent(currentEmailFatura, isEmailAcceptance, lang);
      setEmailData(prev => prev ? { ...prev, subject, body } : null);
      if (currentEmailFatura.id) {
        updateEmailCache(currentEmailFatura.id, { emailLanguage: lang, subject, body });
      }
    }
  };

  const handleTriggerResendEmail = async (fatura: any, isAcceptance?: boolean) => {
    const toastId = toast.loading('Carregando dados das horas da fatura...');
    try {
      // 1. Fetch hours associated with this invoice
      const { data: horasData, error: horasError } = await supabase
        .schema('core_finance')
        .from('horas_trabalhadas')
        .select('*')
        .eq('fatura_id', fatura.id);

      if (horasError) throw horasError;

      // 2. Fetch worker profiles for these hours
      const workerIds = Array.from(new Set((horasData || []).map((h: any) => h.worker_id).filter(Boolean)));
      let workersMap = new Map();
      if (workerIds.length > 0) {
        const { data: wData } = await supabase
          .schema('core_personal')
          .from('workers')
          .select('id, nome, codColab, perfil, nombrecompleto')
          .in('id', workerIds);
        workersMap = new Map((wData || []).map(w => [w.id, w]));
      }
      
      const mappedHours = (horasData || []).map(h => ({
        ...h,
        worker: workersMap.get(h.worker_id)
      }));

      setEmailHours(mappedHours);
      setCurrentEmailFatura(fatura);
      setIsEmailAcceptance(!!isAcceptance);

      // 3. Determine default language
      const clientName = fatura.client?.nombre_comercial || fatura.client?.trade_name || 'Cliente';
      const isSpainClient = clientName.toLowerCase().includes('norcal') || 
                            clientName.toLowerCase().includes('reverter') || 
                            clientName.toLowerCase().includes('sinfines') || 
                            (fatura.client?.countryId === 'country_es_id'); // standard match
      const defaultLang = isSpainClient ? 'es' : 'pt';
      setEmailLanguage(defaultLang);

      const { subject, body } = generateEmailContent(fatura, !!isAcceptance, defaultLang);

      // 4. Resolve default recipient emails
      const defaultEmails: string[] = [];
      const addEmails = (emailStr: string) => {
        if (!emailStr) return;
        emailStr.split(/[;,]/).forEach(e => {
          const trimmed = e.trim();
          if (trimmed && !defaultEmails.includes(trimmed)) {
            defaultEmails.push(trimmed);
          }
        });
      };

      addEmails(fatura.client?.billingEmail || fatura.client?.billing_email);
      addEmails(fatura.client?.clientEmail || fatura.client?.email);

      const adj = fatura.ajustes_json || {};
      const cached = emailCache[fatura.id];
      if (cached) {
        setSelectedEmails(cached.selectedEmails);
        setAdditionalEmails(cached.additionalEmails);
        setSendEmailCheckbox(cached.sendEmailCheckbox);
        setEmailLanguage(cached.emailLanguage);

        setEmailData({
          faturaId: fatura.id,
          clientId: fatura.client_id,
          clientName: clientName,
          recipientEmail: cached.selectedEmails.join(", "),
          subject: cached.subject,
          body: cached.body,
          token: fatura.magic_link_token,
          totalHoras: fatura.total_horas,
          totalValor: fatura.total_valor,
          ajustesJson: adj,
          dataEmissao: fatura.data_emissao,
          paymentTermName: fatura.client?.paymentTermName || 'Pronto Pagamento',
          paymentTermDays: fatura.client?.paymentTermDays || 0,
          fatura
        });
      } else {
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
          paymentTermDays: fatura.client?.paymentTermDays || 0,
          fatura
        });

        updateEmailCache(fatura.id, {
          selectedEmails: defaultEmails,
          additionalEmails: "",
          sendEmailCheckbox: true,
          emailLanguage: defaultLang,
          subject,
          body
        });
      }
      
      toast.dismiss(toastId);
      setIsEmailModalOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar detalhes da fatura: ' + err.message, { id: toastId });
    }
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

    const toastId = toast.loading('Compilando relatórios e gerando anexos em PDF de alta qualidade. Por favor, aguarde...');
    try {
      setSendingEmail(true);

      // Generate actual PDFs
      const relatorioAttachment = await generateHoursPDFAttachmentTracking(emailData.fatura, emailHours, emailLanguage);
      const informeAttachment = await generatePDFAttachmentTracking(emailData.faturaId, emailData.clientName, 'informe');
      const facturaAttachment = await generatePDFAttachmentTracking(emailData.faturaId, emailData.clientName, 'factura');

      const custom_attachments = [];
      if (relatorioAttachment) custom_attachments.push(relatorioAttachment);
      if (informeAttachment) custom_attachments.push(informeAttachment);
      if (facturaAttachment) custom_attachments.push(facturaAttachment);
      
      // Detect URL and convert to a clickable HTML link
      const linkRegex = /(https?:\/\/[^\s]+)/g;
      const htmlBody = emailData.body
        .replace(linkRegex, (url) => `<a href="${url}" style="color: #2563eb; font-weight: bold; text-decoration: underline;">${url}</a>`)
        .replace(/\n/g, '<br/>');

      const { error: functionErr } = await supabase.functions.invoke('send-order-notification', {
        body: {
          empresa_id: emailData.fatura?.empresa_id || selectedEmpresaId,
          to_emails: toEmails,
          email_subject: emailData.subject,
          email_body: htmlBody,
          is_faturamento: true,
          fatura_code: emailData.faturaId.substring(0, 8).toUpperCase(),
          client_name: emailData.clientName,
          custom_attachments
        }
      });

      if (functionErr) {
        console.error('Error invoking send-order-notification for billing tracking:', functionErr);
        toast.error('Falhou ao enviar o e-mail: ' + functionErr.message, { id: toastId });
      } else {
        if (isEmailAcceptance) {
          try {
            const { error: updateStatusError } = await supabase
              .schema('core_finance')
              .from('faturas')
              .update({ status: 'invoice_sent' })
              .eq('id', emailData.faturaId);
              
            if (updateStatusError) {
              console.error('Error updating fatura status to invoice_sent:', updateStatusError);
            } else {
              setFaturas(prev => prev.map(f => f.id === emailData.faturaId ? { ...f, status: 'invoice_sent' } : f));
            }
          } catch (statusErr) {
            console.error('Failed to update invoice status after email send:', statusErr);
          }
        }
        toast.success(`E-mail enviado com sucesso para ${toEmails.join(', ')}!`, { id: toastId });
        setIsEmailModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao enviar e-mail: ' + err.message, { id: toastId });
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
      case 'invoice_sent':
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800 flex w-max items-center gap-1.5 font-medium">
            <Send className="w-3.5 h-3.5" />
            Fatura Enviada
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
                      <TableCell className="font-medium pl-6 text-slate-900 dark:text-slate-100 font-mono">
                        {(() => {
                          if (!fatura.fatura_numero) {
                            return `#${fatura.id.split('-')[0].toUpperCase()}`;
                          }
                          const match = fatura.fatura_numero.match(/\d{4}\/\d+/);
                          return match ? match[0] : fatura.fatura_numero;
                        })()}
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
                        <div className="flex justify-end items-center gap-3">
                          <button
                            onClick={() => handleOpenDispute(fatura)}
                            className="inline-flex items-center gap-1 text-sm text-slate-650 hover:text-slate-750 dark:text-slate-450 dark:hover:text-slate-300 font-bold transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" /> Ver Detalhes
                          </button>
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
                          {(fatura.status === 'approved' || fatura.status === 'invoice_sent') && (
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
                                  <Mail className="w-3.5 h-3.5" /> Enviar Fatura
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
                  <DialogTitle className={`flex items-center gap-2 ${selectedDispute.status === 'disputed' ? 'text-red-700' : 'text-blue-700 dark:text-blue-400'}`}>
                    {selectedDispute.status === 'disputed' ? <XCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    {selectedDispute.status === 'disputed' ? 'Análise de Contestação' : 'Detalhes do Faturamento'} - Fatura {selectedDispute.fatura_numero ? `IF-${selectedDispute.year}/${String(selectedDispute.fatura_numero).padStart(4, '0')}` : `#${selectedDispute.id.substring(0, 8).toUpperCase()}`}
                  </DialogTitle>
                  <DialogDescription className="text-base pt-1">
                    {selectedDispute.status === 'disputed'
                      ? "Revise o motivo fornecido pelo cliente e as discrepâncias apontadas na folha de ponto."
                      : "Consulte o resumo de horas, informe de faturamento e fatura única correspondentes a este ciclo."}
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
                      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-4">
                        <span className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                          Relatório de Horas (Folha de Ponto)
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleExportHoursPDFTracking(selectedDispute)}
                          className="text-[10px] h-7 font-extrabold border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <FileText size={12} /> Baixar Relatório de Horas (PDF)
                        </Button>
                      </div>

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
                  {disputeActiveTab === 'informe' && (() => {
                    const disputeEmpresa = empresas.find(e => e.id === selectedDispute.empresa_id) || empresas.find(e => e.id === selectedEmpresaId);
                    return (
                      <div className="flex flex-col items-center w-full">
                        <div className="flex justify-between items-center w-full max-w-[800px] bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-3 text-xs">
                          <span className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                            Informe de Facturación (Pró-forma)
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleExportA4PDFTracking(selectedDispute.id, selectedDispute.client?.nombre_comercial || 'Cliente', 'informe')}
                            className="text-[10px] h-7 font-extrabold border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <FileText size={12} /> Baixar PDF
                          </Button>
                        </div>
                        
                        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 flex justify-center text-xs rounded-xl w-full">
                          <div id={`informe-sheet-${selectedDispute.id}`} className="w-full max-w-[800px] h-[1130px] bg-white text-slate-800 p-8 pb-20 border border-slate-200 rounded text-left relative flex flex-col justify-between shadow-md select-none">
                            {/* Wrapper do conteúdo flex-1 */}
                            <div className="flex-1">
                              {/* Header */}
                              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
                                <div className="space-y-1">
                                  {disputeEmpresa?.invoice_logo_url ? (
                                    <div className="h-10 flex items-center mb-1">
                                      <img src={disputeEmpresa.invoice_logo_url} alt={disputeEmpresa.nome} className="max-h-full max-w-[180px] object-contain" />
                                    </div>
                                  ) : (
                                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                                      {(disputeEmpresa?.trade_name || disputeEmpresa?.nome || 'MCS').toUpperCase()}
                                    </h3>
                                  )}
                                  <p className="text-[9px] font-bold text-indigo-650 uppercase tracking-widest">Informe de Facturación</p>
                                  <p className="text-[8px] text-muted-foreground">MCS - Gestão Comercial</p>
                                </div>
                                <div className="text-right space-y-1">
                                  <p className="font-bold text-slate-500 uppercase text-[8px]">Documento</p>
                                  <p className="font-bold text-slate-900">
                                    IF-{year}/{String(selectedDispute.fatura_numero || disputeEmpresa?.next_invoice_number || '0001').padStart(4, '0')}
                                  </p>
                                  <p className="text-muted-foreground mt-1 text-[10px]">Emissão: <span className="font-semibold text-slate-700">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                                  <p className="text-muted-foreground text-[10px]">Vencimento: <span className="font-semibold text-slate-700">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                                </div>
                              </div>

                              {/* Emissor e Cliente */}
                              <div className="grid grid-cols-2 gap-4 mb-4 text-[10px]">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-0.5">
                                  <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">Emissor</p>
                                  <p className="font-bold text-slate-900">{disputeEmpresa?.nome || 'MCS'}</p>
                                  <p className="text-muted-foreground">CIF/NIF: {disputeEmpresa?.tax_id || 'N/A'}</p>
                                  <p className="text-muted-foreground">{disputeEmpresa?.address_line || 'N/A'}</p>
                                  <p className="text-muted-foreground">{[disputeEmpresa?.postal_code, disputeEmpresa?.city].filter(Boolean).join(' ')}</p>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-0.5">
                                  <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">Cliente</p>
                                  <p className="font-bold text-slate-900">{selectedDispute.client?.nombre_comercial}</p>
                                  <p className="text-muted-foreground">NIF: {selectedDispute.client?.taxId || selectedDispute.client?.tax_id || 'N/A'}</p>
                                  <p className="text-muted-foreground">{selectedDispute.client?.address_line || 'N/A'}</p>
                                  <p className="text-muted-foreground">{[selectedDispute.client?.postal_code, selectedDispute.client?.city, selectedDispute.client?.province].filter(Boolean).join(', ')}</p>
                                </div>
                              </div>

                              {/* Resumo de Importe */}
                              <h5 className="font-bold uppercase text-slate-400 tracking-wider mb-1.5 text-[8px]">Resumen de Importe</h5>
                              <Table className="border border-slate-150 rounded mb-4 text-[10px]">
                                <TableHeader className="bg-slate-50">
                                  <TableRow>
                                    <TableHead className="font-bold text-slate-700">Concepto</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-28">Valor (€)</TableHead>
                                    <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-32">Total (€)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  <TableRow>
                                    <TableCell className="font-semibold text-slate-850">Importe total</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-850">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-muted-foreground">{adjustments.descricaoServico}</TableCell>
                                    <TableCell className="text-right font-semibold text-slate-850 font-mono">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
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
                                  <TableRow className="bg-slate-50">
                                    <TableCell className="font-bold text-slate-800" colSpan={3}>Total a facturar</TableCell>
                                    <TableCell className="text-right font-extrabold text-slate-900 font-mono">
                                      € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>

                              <div className="text-center font-bold bg-slate-100 py-1 rounded text-slate-700 mb-4 text-[9px]">
                                OBRA: {selectedDispute.ajustes_json?.obra || 'SIN OBRA'}
                              </div>

                              {/* Relação de Trabalhadores */}
                              <h5 className="font-bold uppercase text-slate-400 tracking-wider mb-1.5 text-[8px]">Relación de Trabajadores</h5>
                              <Table className="border border-slate-150 rounded mb-4 text-[10px]">
                                <TableHeader className="bg-slate-50">
                                  <TableRow>
                                    <TableHead className="font-bold text-slate-700 pl-4">Trabajador</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-40">Cantidad de horas</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-40">Precio hora (€)</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-40 pr-4">Total (€)</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {groupedDisputeWorkersEnriched.map(w => (
                                    <TableRow key={w.workerId}>
                                      <TableCell className="font-semibold text-slate-800 pl-4">{w.workerName}</TableCell>
                                      <TableCell className="text-right font-medium text-slate-800">{w.totalHoras.toFixed(2)}h</TableCell>
                                      <TableCell className="text-right font-medium text-slate-800">€ {w.tarifa.toFixed(2)}</TableCell>
                                      <TableCell className="text-right font-bold text-slate-800 pr-4 font-mono">€ {w.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow className="bg-slate-50">
                                    <TableCell className="font-bold text-slate-800 pl-4">Totales</TableCell>
                                    <TableCell className="text-right font-bold text-slate-800">{totalHorasCalculadas.toFixed(2)}h</TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                    <TableCell className="text-right font-extrabold text-slate-900 pr-4 font-mono">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>

                            {/* Wrapper do rodapé */}
                            <div className="space-y-4">
                              {/* Informações Bancárias */}
                              <div className="border-t border-slate-150 pt-3 text-muted-foreground space-y-0.5 font-medium leading-relaxed text-[9px]">
                                <span className="font-bold uppercase text-slate-400 text-[7px] block mb-0.5">Dados de Depósito / IBAN</span>
                                <p className="whitespace-pre-line font-mono">{adjustments.iban || disputeEmpresa?.iban || 'N/A'}</p>
                              </div>
                            </div>

                            {/* Barra preta com logotipo decorativo */}
                            <div className="absolute bottom-0 left-0 right-0 h-[35px] bg-[#1a1a1a] text-slate-300 flex items-center justify-between px-6 text-[7px] font-sans rounded-b select-none overflow-hidden">
                              <div className="absolute left-0 bottom-0 top-0 w-16 bg-gradient-to-r from-orange-500 to-transparent opacity-20 skew-x-12 transform origin-bottom-left"></div>
                              <span className="relative z-10 font-medium">
                                Produzido por weoInvoice - Sistema de Facturação Online Gratuito - www.weoinvoice.com
                              </span>
                              <span className="relative z-10 font-bold">
                                ORIGINAL
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Factura Única Tab */}
                  {disputeActiveTab === 'factura' && (() => {
                    const disputeEmpresa = empresas.find(e => e.id === selectedDispute.empresa_id) || empresas.find(e => e.id === selectedEmpresaId);
                    return (
                      <div className="flex flex-col items-center w-full">
                        <div className="flex justify-between items-center w-full max-w-[800px] bg-blue-50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-3 text-xs">
                          <span className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                            Factura Única AT (Pro-forma / Definitiva)
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleExportA4PDFTracking(selectedDispute.id, selectedDispute.client?.nombre_comercial || 'Cliente', 'factura')}
                            className="text-[10px] h-7 font-extrabold border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                          >
                            <FileText size={12} /> Baixar PDF
                          </Button>
                        </div>
                        
                        <div className="p-4 bg-slate-100 dark:bg-slate-900/50 flex justify-center text-xs rounded-xl w-full">
                          <div id={`factura-sheet-${selectedDispute.id}`} className="w-full max-w-[800px] h-[1130px] bg-white text-slate-800 p-8 pb-20 border border-slate-200 rounded text-left relative flex flex-col justify-between shadow-md select-none">
                            {/* Wrapper do conteúdo flex-1 */}
                            <div className="flex-1">
                              {/* Top row */}
                              <div className="flex justify-between items-start mb-6">
                                <div>
                                  <h3 className="text-base font-extrabold text-slate-900">
                                    Factura {selectedDispute.year}/{String(selectedDispute.fatura_numero || disputeEmpresa?.next_invoice_number || '0001').padStart(4, '0')}
                                  </h3>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">ORIGINAL</p>
                                </div>
                                {/* QR Code dinâmico */}
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[8px] font-bold text-slate-700 font-sans">
                                    ATCUD: {selectedDispute.atcud || `${disputeEmpresa?.atcud_prefix || 'J6XBVVRV'}-${selectedDispute.fatura_numero || 1}`}
                                  </span>
                                  <div className="border border-slate-200 p-1 bg-white rounded shadow-sm">
                                    <QRCodeSVG
                                      value={`${window.location.origin}/aprovacao-cliente/${selectedDispute.magic_link_token || 'draft'}`}
                                      size={50}
                                      level="H"
                                      includeMargin={false}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* De / Para */}
                              <div className="grid grid-cols-2 gap-6 mb-6 leading-relaxed text-[10px]">
                                <div>
                                  <p className="font-bold text-[7px] text-slate-400 uppercase">De</p>
                                  <p className="font-bold text-slate-900">{disputeEmpresa?.nome || 'MCS'}</p>
                                  <p className="text-muted-foreground">{disputeEmpresa?.address_line || 'N/A'}</p>
                                  <p className="text-muted-foreground">{[disputeEmpresa?.postal_code, disputeEmpresa?.city].filter(Boolean).join(' ')}</p>
                                  <p className="text-muted-foreground">NIF: {disputeEmpresa?.tax_id || 'N/A'}</p>
                                  <p className="text-muted-foreground mt-1.5 font-semibold">Conta:</p>
                                  <p className="text-muted-foreground font-mono text-[9px] whitespace-pre-line">
                                    {(adjustments.iban || disputeEmpresa?.iban || 'N/A').split('\n')[0]}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-bold text-[7px] text-slate-400 uppercase">Para</p>
                                  <p className="font-bold text-slate-900">{selectedDispute.client?.nombre_comercial}</p>
                                  <p className="text-muted-foreground">{selectedDispute.client?.address_line || 'N/A'}</p>
                                  <p className="text-muted-foreground">{[selectedDispute.client?.postal_code, selectedDispute.client?.city, selectedDispute.client?.province].filter(Boolean).join(', ')}</p>
                                  <p className="text-muted-foreground mt-1.5">Data Emissão: <span className="font-bold text-slate-700">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                                  <p className="text-muted-foreground">Data Vencimento: <span className="font-bold text-slate-700">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                                </div>
                              </div>

                              {/* Tabela de Itens */}
                              <div className="bg-orange-500 text-white font-bold uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0 text-[8px]">
                                Lista de Artigos
                              </div>
                              <Table className="border border-slate-200 rounded-b mb-4 text-[10px]">
                                <TableHeader className="bg-slate-50">
                                  <TableRow>
                                    <TableHead className="font-bold text-slate-700 pl-3">Artigo</TableHead>
                                    <TableHead className="font-bold text-slate-700">Descrição</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-24">Qtd.</TableHead>
                                    <TableHead className="font-bold text-slate-700 w-16">Un.</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-24">Pr. Unitário</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 w-24 pr-3">Valor</TableHead>
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
                              <Table className="border border-slate-200 rounded-b mb-4 text-[10px]">
                                <TableBody>
                                  <TableRow>
                                    <TableCell className="font-bold" colSpan={3}>Subtotal da Obra</TableCell>
                                    <TableCell className="text-right font-bold w-40 pr-3 font-mono">€ {(totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell className="font-bold" colSpan={3}>IVA {adjustments.ivaPct}%</TableCell>
                                    <TableCell className="text-right font-bold w-40 pr-3 font-mono">€ {((totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)) * Number(adjustments.ivaPct || 0)/100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                                  </TableRow>
                                  <TableRow className="bg-orange-50/50">
                                    <TableCell className="font-extrabold text-orange-850" colSpan={3}>Total da Fatura</TableCell>
                                    <TableCell className="text-right font-extrabold text-orange-950 text-[11px] pr-3 font-mono">
                                      € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>

                              {/* Condições de IVA */}
                              <div className="text-[8px] text-muted-foreground mb-4 font-semibold">
                                Condições de Enquadramento de IVA:<br/>
                                (1) {Number(adjustments.ivaPct) === 0 ? 'M40-IVA - autoliquidação' : 'Regime Geral'}
                              </div>
                            </div>

                            {/* Wrapper do rodapé */}
                            <div className="space-y-4">
                              {/* Footer de moradas */}
                              <div className="border-t border-slate-200 pt-3 flex justify-between text-[8px] text-muted-foreground font-medium mb-2">
                                <div>
                                  <p className="font-bold uppercase mb-0.5">Local de Carga</p>
                                  <p>{disputeEmpresa?.address_line || 'N/ Morada'}</p>
                                  <p>{[disputeEmpresa?.postal_code, disputeEmpresa?.city].filter(Boolean).join(' ')}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold uppercase mb-0.5">Local de Descarga</p>
                                  <p>{selectedDispute.client?.address_line || 'V/ Morada'}</p>
                                  <p>{[selectedDispute.client?.postal_code, selectedDispute.client?.city, selectedDispute.client?.province].filter(Boolean).join(', ')}</p>
                                </div>
                              </div>

                              {/* Certified Software */}
                              <div className="text-center text-[8px] text-slate-700 italic font-semibold mb-2">
                                {disputeEmpresa?.certified_software_text || 'Rexx - Processado por Programa Certificado nº 1123/AT'}
                              </div>
                            </div>

                            {/* Barra preta com logotipo decorativo */}
                            <div className="absolute bottom-0 left-0 right-0 h-[35px] bg-[#1a1a1a] text-slate-300 flex items-center justify-between px-6 text-[7px] font-sans rounded-b select-none overflow-hidden">
                              <div className="absolute left-0 bottom-0 top-0 w-16 bg-gradient-to-r from-orange-500 to-transparent opacity-20 skew-x-12 transform origin-bottom-left"></div>
                              <span className="relative z-10 font-medium">
                                Produzido por weoInvoice - Sistema de Facturação Online Gratuito - www.weoinvoice.com
                              </span>
                              <span className="relative z-10 font-bold">
                                ORIGINAL
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <DialogFooter className="gap-2 sm:gap-0 border-t dark:border-slate-800 pt-4 mt-2">
                  <Button variant="outline" onClick={() => setSelectedDispute(null)} disabled={resolvingDispute}>
                    Fechar
                  </Button>
                  {selectedDispute.status === 'disputed' && (
                    <>
                      <Button variant="outline" onClick={() => handleResolveDispute(false)} disabled={resolvingDispute} className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700">
                        {resolvingDispute ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Recusar & Comentar
                      </Button>
                      <Button onClick={() => handleResolveDispute(true)} disabled={resolvingDispute} className="bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                        {resolvingDispute ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Aceitar Proposta & Atualizar Ponto
                      </Button>
                    </>
                  )}
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
            const currentEmpresa = empresas.find(e => e.id === emailData.fatura?.empresa_id) || empresas.find(e => e.id === selectedEmpresaId);

            const emailOptions: Array<{ id: string; email: string; label: string }> = [];
            const addedEmails = new Set<string>();

            const addEmailsToOptions = (emailStr: string, prefix: string, labelPrefix: string) => {
              if (!emailStr) return;
              emailStr.split(/[;,]/).forEach((e, idx) => {
                const trimmed = e.trim();
                if (trimmed && !addedEmails.has(trimmed)) {
                  addedEmails.add(trimmed);
                  emailOptions.push({
                    id: `${prefix}_${idx}`,
                    email: trimmed,
                    label: `${labelPrefix} (${trimmed})`
                  });
                }
              });
            };

            addEmailsToOptions(
              emailData.fatura?.client?.billingEmail || emailData.fatura?.client?.billing_email,
              'billing_email',
              'E-mail de Faturamento'
            );
            addEmailsToOptions(
              emailData.fatura?.client?.clientEmail || emailData.fatura?.client?.email,
              'client_email',
              'E-mail Geral'
            );
            


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
                        <span className="font-medium">{currentEmpresa?.trade_name || currentEmpresa?.nome || 'Stocco'}</span>
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
                      <button
                        type="button"
                        onClick={() => handleExportHoursPDFTracking(emailData.fatura)}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold text-left transition-all"
                        title="Clique para visualizar/baixar o Relatório de Horas"
                      >
                        <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Relatorio_Datas_Trabalhadas.pdf</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportA4PDFTracking(emailData.faturaId, emailData.clientName, 'informe')}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold text-left transition-all"
                        title="Clique para visualizar/baixar o Informe de Faturamento"
                      >
                        <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Informe_Facturacion.pdf</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportA4PDFTracking(emailData.faturaId, emailData.clientName, 'factura')}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-bold text-left transition-all"
                        title="Clique para visualizar/baixar a Factura Única"
                      >
                        <FileText className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Factura_Pró-forma.pdf</span>
                      </button>
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
                      onChange={e => {
                        setSendEmailCheckbox(e.target.checked);
                        if (emailData?.faturaId) {
                          updateEmailCache(emailData.faturaId, { sendEmailCheckbox: e.target.checked });
                        }
                      }}
                      className="h-4.5 w-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="send_email_chk_billing_tracking" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
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
                                    const next = [...selectedEmails, opt.email];
                                    setSelectedEmails(next);
                                    if (emailData?.faturaId) {
                                      updateEmailCache(emailData.faturaId, { selectedEmails: next });
                                    }
                                  } else {
                                    const next = selectedEmails.filter(email => email !== opt.email);
                                    setSelectedEmails(next);
                                    if (emailData?.faturaId) {
                                      updateEmailCache(emailData.faturaId, { selectedEmails: next });
                                    }
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
                          onChange={e => {
                            setAdditionalEmails(e.target.value);
                            if (emailData?.faturaId) {
                              updateEmailCache(emailData.faturaId, { additionalEmails: e.target.value });
                            }
                          }}
                          placeholder="financeiro@empresa.com, diretoria@empresa.com"
                          className="h-9 text-xs dark:bg-slate-950 dark:border-slate-800"
                        />
                      </div>

                      {/* Assunto */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 dark:text-slate-400">Assunto do E-mail</label>
                        <Input
                          value={emailData.subject}
                          onChange={(e) => {
                            setEmailData({ ...emailData, subject: e.target.value });
                            if (emailData?.faturaId) {
                              updateEmailCache(emailData.faturaId, { subject: e.target.value });
                            }
                          }}
                          placeholder="Assunto do e-mail"
                          className="h-9 text-xs font-bold dark:bg-slate-950 dark:border-slate-800"
                        />
                      </div>

                      {/* Corpo do E-mail */}
                      <div className="space-y-1.5">
                        <label className="text-slate-500 dark:text-slate-400">Corpo do E-mail</label>
                        <Textarea
                          value={emailData.body}
                          onChange={(e) => {
                            setEmailData({ ...emailData, body: e.target.value });
                            if (emailData?.faturaId) {
                              updateEmailCache(emailData.faturaId, { body: e.target.value });
                            }
                          }}
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
                      {isEmailAcceptance ? 'Confirmar e Enviar Fatura' : 'Confirmar e Reenviar E-mail'}
                    </Button>
                  </div>
                </div>

                {/* Hidden PDF Templates container */}
                <div className="hidden" style={{ position: 'absolute', left: '-9999px', top: 0, width: '800px' }}>
                  {/* Informe Sheet Template */}
                  <div id={`informe-sheet-tracking-${emailData.faturaId}`} className="w-full max-w-[800px] bg-white p-8 border border-slate-200 text-slate-800 text-left">
                    <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
                      <div className="space-y-2">
                        {currentEmpresa?.invoice_logo_url ? (
                          <div className="h-14 flex items-center mb-2">
                            <img src={currentEmpresa.invoice_logo_url} alt={currentEmpresa.nome} className="max-h-full max-w-[220px] object-contain" />
                          </div>
                        ) : (
                          <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            {(currentEmpresa?.trade_name || currentEmpresa?.nome || 'STOCCO').toUpperCase()}
                          </h3>
                        )}
                        <p className="text-xs font-bold text-indigo-605 uppercase tracking-widest">Informe de Facturación</p>
                        <p className="text-[10px] text-muted-foreground">MCS - Gestão Comercial</p>
                      </div>
                      <div className="text-right text-xs space-y-1">
                        <p className="font-bold text-slate-500 uppercase text-[10px]">Documento</p>
                        <p className="font-bold text-slate-900">IF-{new Date(emailData.fatura.created_at || emailData.fatura.data_emissao).getFullYear()}/{String(emailData.fatura.fatura_numero || currentEmpresa?.next_invoice_number || '0001').padStart(4, '0')}</p>
                        <p className="text-muted-foreground mt-2">Emissão: <span className="font-semibold text-slate-700">{new Date((emailData.fatura.data_emissao || new Date().toISOString().split('T')[0]) + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                        <p className="text-muted-foreground">Vencimento: <span className="font-semibold text-slate-700">{(() => {
                          const emission = new Date(emailData.fatura.data_emissao || new Date());
                          emission.setDate(emission.getDate() + (emailData.fatura.client?.paymentTermDays || 30));
                          return emission.toLocaleDateString('pt-PT');
                        })()}</span></p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1">
                        <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Emissor</p>
                        <p className="font-bold text-slate-900">{currentEmpresa?.nome || 'STOCCO LDA'}</p>
                        <p className="text-muted-foreground">NIF: {currentEmpresa?.tax_id || 'PT517834747'}</p>
                        <p className="text-muted-foreground">{currentEmpresa?.address_line || 'R. São Tomé e Príncipe, 287'}</p>
                        <p className="text-muted-foreground">{[currentEmpresa?.postal_code, currentEmpresa?.city].filter(Boolean).join(' ')}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1">
                        <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Cliente</p>
                        <p className="font-bold text-slate-900">{emailData.clientName}</p>
                        <p className="text-muted-foreground">NIF: {emailData.fatura.client?.taxId || 'N/A'}</p>
                        <p className="text-muted-foreground">{emailData.fatura.client?.address_line || 'N/A'}</p>
                        <p className="text-muted-foreground">{[emailData.fatura.client?.postal_code, emailData.fatura.client?.city].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>

                    <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Resumen de Importe</h5>
                    <table className="w-full border border-slate-150 rounded mb-6 text-xs text-left border-collapse">
                      <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2 pl-3">Concepto</th>
                          <th className="p-2 text-right w-28 font-bold">Valor (€)</th>
                          <th className="p-2 font-bold">Descripción</th>
                          <th className="p-2 text-right w-32 font-bold pr-3">Total (€)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="p-2.5 pl-3 font-medium">Importe total</td>
                          <td className="p-2.5 text-right font-semibold">€ {currentTotalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          <td className="p-2.5 text-muted-foreground">{currentAdj.descricao_servico || 'Serviços Prestados'}</td>
                          <td className="p-2.5 text-right font-semibold font-mono pr-3">€ {currentTotalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {Number(currentAdj.incrementos) > 0 && (
                          <tr className="border-b border-slate-100 text-emerald-600">
                            <td className="p-2.5 pl-3 font-medium">Incrementos</td>
                            <td className="p-2.5 text-right font-semibold">€ {Number(currentAdj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2.5 text-muted-foreground">{currentAdj.incrementos_desc || 'Adicional'}</td>
                            <td className="p-2.5 text-right font-semibold font-mono pr-3">€ {Number(currentAdj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        )}
                        {Number(currentAdj.reducoes) > 0 && (
                          <tr className="border-b border-slate-100 text-rose-600">
                            <td className="p-2.5 pl-3 font-medium">Reducciones</td>
                            <td className="p-2.5 text-right font-semibold">€ -{Number(currentAdj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2.5 text-muted-foreground">{currentAdj.reducoes_desc || 'Desconto'}</td>
                            <td className="p-2.5 text-right font-semibold font-mono pr-3">€ -{Number(currentAdj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        )}
                        <tr className="bg-slate-50 font-extrabold border-t border-slate-200">
                          <td className="p-2.5 text-slate-800 pl-3" colSpan={3}>Total a facturar</td>
                          <td className="p-2.5 text-right font-extrabold text-slate-900 text-sm font-mono pr-3">
                            € {currentFinalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider mb-2">Relación de Trabajadores</h5>
                    <table className="w-full border border-slate-150 rounded text-xs mb-8 text-left border-collapse">
                      <thead className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="p-2 pl-4 font-bold">Trabajador</th>
                          <th className="p-2 text-right font-bold w-40">Cantidad de horas</th>
                          <th className="p-2 text-right font-bold w-40">Precio hora (€)</th>
                          <th className="p-2 text-right font-bold w-40 pr-4 font-bold">Total (€)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const workerSummary: Record<string, { name: string; hours: number; rate: number; total: number }> = {};
                          emailHours.forEach(h => {
                            const wId = h.worker_id;
                            if (!wId) return;
                            const name = h.worker?.nombrecompleto || h.worker?.nome || 'Colaborador';
                            const rate = Number(h.tarifa_faturada || 27.00);
                            const hours = Number(h.horas_totais || 0);
                            if (!workerSummary[wId]) {
                              workerSummary[wId] = { name, hours: 0, rate, total: 0 };
                            }
                            workerSummary[wId].hours += hours;
                            workerSummary[wId].total += hours * rate;
                          });

                          return Object.values(workerSummary).map((w, idx) => (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="p-2.5 pl-4 font-medium">{w.name}</td>
                              <td className="p-2.5 text-right font-semibold">{w.hours.toFixed(2)}h</td>
                              <td className="p-2.5 text-right">€ {w.rate.toFixed(2)}</td>
                              <td className="p-2.5 text-right font-bold pr-4 font-mono">€ {w.total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Factura Pró-forma Template */}
                  <div id={`factura-sheet-tracking-${emailData.faturaId}`} className="w-full max-w-[800px] h-[1130px] bg-white p-8 pb-20 border border-slate-200 text-slate-800 rounded text-left relative flex flex-col justify-between select-none shadow-md">
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            Factura Pró-forma FP-{new Date(emailData.fatura.created_at || emailData.fatura.data_emissao).getFullYear()}/{String(emailData.fatura.fatura_numero || currentEmpresa?.next_invoice_number || '0001').padStart(4, '0')}
                          </h3>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">PRÓ-FORMA</p>
                        </div>
                        {currentEmpresa?.invoice_logo_url && (
                          <div className="h-10 flex items-center">
                            <img src={currentEmpresa.invoice_logo_url} alt={currentEmpresa.nome} className="max-h-full max-w-[180px] object-contain" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6 mb-6 leading-relaxed text-[10px]">
                        <div>
                          <p className="font-bold text-[7px] text-slate-400 uppercase">De</p>
                          <p className="font-bold text-slate-900">{currentEmpresa?.nome || 'STOCCO LDA'}</p>
                          <p className="text-muted-foreground">{currentEmpresa?.address_line || 'Rua Padre António Maria Pinho, n.º 353'}</p>
                          <p className="text-muted-foreground">{[currentEmpresa?.postal_code, currentEmpresa?.city].filter(Boolean).join(' ')}</p>
                          <p className="text-muted-foreground">NIF: {currentEmpresa?.tax_id || 'PT517834747'}</p>
                          <p className="text-muted-foreground mt-1.5 font-semibold">Conta:</p>
                          <p className="text-muted-foreground font-mono text-[9px]">{currentEmpresa?.iban || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-[7px] text-slate-400 uppercase">Para</p>
                          <p className="font-bold text-slate-900">{emailData.clientName}</p>
                          <p className="text-muted-foreground">{emailData.fatura.client?.address_line || 'N/A'}</p>
                          <p className="text-muted-foreground">{[emailData.fatura.client?.postal_code, emailData.fatura.client?.city, emailData.fatura.client?.province].filter(Boolean).join(', ')}</p>
                          <p className="text-muted-foreground">NIF: {emailData.fatura.client?.taxId || 'N/A'}</p>
                          <p className="text-muted-foreground mt-1.5">Data Emissão: <span className="font-bold text-slate-700">{new Date((emailData.fatura.data_emissao || new Date().toISOString().split('T')[0]) + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                          <p className="text-muted-foreground">Data Vencimento: <span className="font-bold text-slate-700">{(() => {
                            const emission = new Date(emailData.fatura.data_emissao || new Date());
                            emission.setDate(emission.getDate() + (emailData.fatura.client?.paymentTermDays || 30));
                            return emission.toLocaleDateString('pt-PT');
                          })()}</span></p>
                        </div>
                      </div>

                      <table className="w-full text-[9px] text-left border-collapse mb-6">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 uppercase font-bold border-b text-[7px] tracking-wider">
                            <th className="p-2 pl-3">Código</th>
                            <th className="p-2">Descrição</th>
                            <th className="p-2 text-right">Qtd</th>
                            <th className="p-2 text-center">Un.</th>
                            <th className="p-2 text-right">Preço (€)</th>
                            <th className="p-2 text-right pr-3">Total (€)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2 pl-3 font-semibold text-indigo-650">SERV-HORAS</td>
                            <td className="p-2 text-muted-foreground">{currentAdj.descricao_servico || 'Serviços Prestados'}</td>
                            <td className="p-2 text-right">{emailData.totalHoras.toFixed(2)}</td>
                            <td className="p-2 text-center">UN</td>
                            <td className="p-2 text-right">€ {(emailData.totalHoras > 0 ? (currentTotalBase / emailData.totalHoras) : 0).toFixed(2)}</td>
                            <td className="p-2 text-right font-semibold pr-3 font-mono">€ {currentTotalBase.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          {Number(currentAdj.incrementos) > 0 && (
                            <tr className="border-b text-emerald-600">
                              <td className="p-2 pl-3 font-semibold">INC-OBRA</td>
                              <td className="p-2 text-muted-foreground">{currentAdj.incrementos_desc || 'Incremento Adicional'}</td>
                              <td className="p-2 text-right">1.00</td>
                              <td className="p-2 text-center">UN</td>
                              <td className="p-2 text-right">€ {Number(currentAdj.incrementos).toFixed(2)}</td>
                              <td className="p-2 text-right font-bold pr-3 font-mono">€ {Number(currentAdj.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          )}
                          {Number(currentAdj.reducoes) > 0 && (
                            <tr className="border-b text-rose-600">
                              <td className="p-2 pl-3 font-semibold">DESC-COM</td>
                              <td className="p-2 text-muted-foreground">{currentAdj.reducoes_desc || 'Redução Comercial'}</td>
                              <td className="p-2 text-right">1.00</td>
                              <td className="p-2 text-center">UN</td>
                              <td className="p-2 text-right">€ -{Number(currentAdj.reducoes).toFixed(2)}</td>
                              <td className="p-2 text-right font-bold pr-3 font-mono">€ -{Number(currentAdj.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      <div className="bg-slate-800 text-white font-bold uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0 text-[8px]">
                        Resumo Financeiro
                      </div>
                      <table className="w-full border border-slate-200 rounded-b mb-6 text-[10px] text-left border-collapse">
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2 font-bold" colSpan={3}>Subtotal</td>
                            <td className="p-2 text-right font-bold w-40 pr-3 font-mono">€ {(currentTotalBase + Number(currentAdj.incrementos || 0) - Number(currentAdj.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 font-bold" colSpan={3}>IVA {currentAdj.iva_pct || 0}%</td>
                            <td className="p-2 text-right font-bold w-40 pr-3 font-mono">€ {((currentTotalBase + Number(currentAdj.incrementos || 0) - Number(currentAdj.reducoes || 0)) * Number(currentAdj.iva_pct || 0)/100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="bg-slate-50 font-extrabold text-blue-900 border-t">
                            <td className="p-2 text-blue-900 font-extrabold" colSpan={3}>Total FP</td>
                            <td className="p-2 text-right font-extrabold text-blue-950 text-[11px] pr-3 font-mono">
                              € {currentFinalTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="text-[8px] text-muted-foreground mb-4 font-semibold">
                        Condições de Enquadramento de IVA:<br/>
                        (1) Autoliquidação de IVA
                      </div>
                    </div>

                    <div>
                      <div className="border-t border-slate-100 pt-3 flex justify-between text-[8px] text-muted-foreground font-medium mb-2">
                        <div>
                          <p className="font-bold uppercase mb-0.5">Local de Carga</p>
                          <p>{currentEmpresa?.address_line || 'Rua Conselheiro Fonseca, n.º 157'}</p>
                          <p>{[currentEmpresa?.postal_code, currentEmpresa?.city].filter(Boolean).join(' ')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold uppercase mb-0.5">Local de Descarga</p>
                          <p>{emailData.fatura.client?.address_line || 'N/A'}</p>
                          <p>{[emailData.fatura.client?.postal_code, emailData.fatura.client?.city].filter(Boolean).join(' ')}</p>
                        </div>
                      </div>
                      <div className="text-center text-[7px] text-muted-foreground italic font-semibold">
                        {currentEmpresa?.certified_software_text || 'Rexx - Processado por Programa Certificado nº 1123/AT'}
                      </div>
                    </div>
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

      {/* Hidden container for background PDF generation */}
      {pdfRenderData && (() => {
        const fat = pdfRenderData.fatura;
        const type = pdfRenderData.type;
        const disputeEmpresa = empresas.find(e => e.id === fat.empresa_id) || empresas.find(e => e.id === selectedEmpresaId);
        
        const adjustments = (() => {
          const adj = fat.ajustes_json || {};
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
          pdfRenderData.hours.forEach(h => {
            const proposed = fat.ajustes_json?.disputed_hours?.[h.worker_id]?.[h.data_trabalho];
            const hoursVal = proposed !== undefined ? proposed : h.horas_totais;
            sum += hoursVal * (h.tarifa_faturada || 0);
          });
          return sum;
        })();
        
        const finalTotalVal = (totalBaseVal + adjustments.incrementos - adjustments.reducoes) * (1 + adjustments.ivaPct / 100);
        
        const totalHorasCalculadas = (() => {
          let sum = 0;
          pdfRenderData.hours.forEach(h => {
            const proposed = fat.ajustes_json?.disputed_hours?.[h.worker_id]?.[h.data_trabalho];
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

          pdfRenderData.hours.forEach(h => {
            const wId = h.worker_id;
            if (!wId) return;

            const proposed = fat.ajustes_json?.disputed_hours?.[wId]?.[h.data_trabalho];
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

        const dataEmissaoStr = fat.data_emissao || new Date().toISOString().split('T')[0];
        const termDays = fat.client?.paymentTermDays || 30;
        const emissionDate = fat.data_emissao ? new Date(fat.data_emissao) : new Date();
        const dueDate = new Date(emissionDate);
        dueDate.setDate(dueDate.getDate() + termDays);
        const dataVencimentoStr = dueDate.toISOString().split('T')[0];
        const year = new Date(dataEmissaoStr).getFullYear();

        return (
          <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}>
            {type === 'informe' ? (
              <div id={`pdf-render-informe-sheet-${fat.id}`} className="w-full max-w-[800px] h-[1130px] bg-white text-slate-800 p-8 pb-20 border border-slate-200 rounded text-left relative flex flex-col justify-between shadow-md select-none">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-100 pb-4 mb-4">
                    <div className="space-y-1">
                      {disputeEmpresa?.invoice_logo_url ? (
                        <div className="h-10 flex items-center mb-1">
                          <img src={disputeEmpresa.invoice_logo_url} alt={disputeEmpresa.nome} className="max-h-full max-w-[180px] object-contain" />
                        </div>
                      ) : (
                        <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                          {(disputeEmpresa?.trade_name || disputeEmpresa?.nome || 'MCS').toUpperCase()}
                        </h3>
                      )}
                      <p className="text-[9px] font-bold text-indigo-650 uppercase tracking-widest">Informe de Facturación</p>
                      <p className="text-[8px] text-muted-foreground">MCS - Gestão Comercial</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-slate-500 uppercase text-[8px]">Documento</p>
                      <p className="font-bold text-slate-900">
                        IF-{year}/{String(fat.fatura_numero || disputeEmpresa?.next_invoice_number || '0001').padStart(4, '0')}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[10px]">Emissão: <span className="font-semibold text-slate-700">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                      <p className="text-muted-foreground text-[10px]">Vencimento: <span className="font-semibold text-slate-700">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                    </div>
                  </div>

                  {/* Emissor e Cliente */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-[10px]">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-0.5">
                      <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">Emissor</p>
                      <p className="font-bold text-slate-900">{disputeEmpresa?.nome || 'MCS'}</p>
                      <p className="text-muted-foreground">CIF/NIF: {disputeEmpresa?.tax_id || 'N/A'}</p>
                      <p className="text-muted-foreground">{disputeEmpresa?.address_line || 'N/A'}</p>
                      <p className="text-muted-foreground">{[disputeEmpresa?.postal_code, disputeEmpresa?.city].filter(Boolean).join(' ')}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-0.5">
                      <p className="font-bold text-slate-400 uppercase text-[7px] mb-0.5">Cliente</p>
                      <p className="font-bold text-slate-900">{fat.client?.nombre_comercial}</p>
                      <p className="text-muted-foreground">NIF: {fat.client?.taxId || fat.client?.tax_id || 'N/A'}</p>
                      <p className="text-muted-foreground">{fat.client?.address_line || 'N/A'}</p>
                      <p className="text-muted-foreground">{[fat.client?.postal_code, fat.client?.city, fat.client?.province].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>

                  {/* Resumo de Importe */}
                  <h5 className="font-bold uppercase text-slate-400 tracking-wider mb-1.5 text-[8px]">Resumen de Importe</h5>
                  <Table className="border border-slate-150 rounded mb-4 text-[10px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700">Concepto</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-28">Valor (€)</TableHead>
                        <TableHead className="font-bold text-slate-700">Descripción</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-32">Total (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-semibold text-slate-850">Importe total</TableCell>
                        <TableCell className="text-right font-semibold text-slate-850">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-muted-foreground">{adjustments.descricaoServico}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-850 font-mono">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
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
                      <TableRow className="bg-slate-50">
                        <TableCell className="font-bold text-slate-800" colSpan={3}>Total a facturar</TableCell>
                        <TableCell className="text-right font-extrabold text-slate-900 font-mono">
                          € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="text-center font-bold bg-slate-100 py-1 rounded text-slate-700 mb-4 text-[9px]">
                    OBRA: {fat.ajustes_json?.obra || 'SIN OBRA'}
                  </div>

                  {/* Relação de Trabalhadores */}
                  <h5 className="font-bold uppercase text-slate-400 tracking-wider mb-1.5 text-[8px]">Relación de Trabajadores</h5>
                  <Table className="border border-slate-150 rounded mb-4 text-[10px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 pl-4">Trabajador</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-40">Quantidade de horas</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-40">Precio hora (€)</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-40 pr-4">Total (€)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedDisputeWorkersEnriched.map(w => (
                        <TableRow key={w.workerId}>
                          <TableCell className="font-semibold text-slate-800 pl-4">{w.workerName}</TableCell>
                          <TableCell className="text-right font-medium text-slate-800">{w.totalHoras.toFixed(2)}h</TableCell>
                          <TableCell className="text-right font-medium text-slate-800">€ {w.tarifa.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-slate-800 pr-4 font-mono">€ {w.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50">
                        <TableCell className="font-bold text-slate-800 pl-4">Totales</TableCell>
                        <TableCell className="text-right font-bold text-slate-800">{totalHorasCalculadas.toFixed(2)}h</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right font-extrabold text-slate-900 pr-4 font-mono">€ {totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Wrapper do rodapé */}
                <div className="space-y-4">
                  <div className="border-t border-slate-150 pt-3 text-muted-foreground space-y-0.5 font-medium leading-relaxed text-[9px]">
                    <span className="font-bold uppercase text-slate-400 text-[7px] block mb-0.5">Dados de Depósito / IBAN</span>
                    <p className="whitespace-pre-line font-mono">{adjustments.iban || disputeEmpresa?.iban || 'N/A'}</p>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[35px] bg-[#1a1a1a] text-slate-300 flex items-center justify-between px-6 text-[7px] font-sans rounded-b select-none overflow-hidden">
                  <div className="absolute left-0 bottom-0 top-0 w-16 bg-gradient-to-r from-orange-500 to-transparent opacity-20 skew-x-12 transform origin-bottom-left"></div>
                  <span className="relative z-10 font-medium">
                    Produzido por weoInvoice - Sistema de Facturação Online Gratuito - www.weoinvoice.com
                  </span>
                  <span className="relative z-10 font-bold">
                    ORIGINAL
                  </span>
                </div>
              </div>
            ) : (
              <div id={`pdf-render-factura-sheet-${fat.id}`} className="w-full max-w-[800px] h-[1130px] bg-white text-slate-800 p-8 pb-20 border border-slate-200 rounded text-left relative flex flex-col justify-between shadow-md select-none">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        Factura {fat.year}/{String(fat.fatura_numero || disputeEmpresa?.next_invoice_number || '0001').padStart(4, '0')}
                      </h3>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">ORIGINAL</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] font-bold text-slate-700 font-sans">
                        ATCUD: {fat.atcud || `${disputeEmpresa?.atcud_prefix || 'J6XBVVRV'}-${fat.fatura_numero || 1}`}
                      </span>
                      <div className="border border-slate-200 p-1 bg-white rounded shadow-sm">
                        <QRCodeSVG
                          value={`${window.location.origin}/aprovacao-cliente/${fat.magic_link_token || 'draft'}`}
                          size={50}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6 leading-relaxed text-[10px]">
                    <div>
                      <p className="font-bold text-[7px] text-slate-400 uppercase">De</p>
                      <p className="font-bold text-slate-900">{disputeEmpresa?.nome || 'MCS'}</p>
                      <p className="text-muted-foreground">{disputeEmpresa?.address_line || 'N/A'}</p>
                      <p className="text-muted-foreground">{[disputeEmpresa?.postal_code, disputeEmpresa?.city].filter(Boolean).join(' ')}</p>
                      <p className="text-muted-foreground">NIF: {disputeEmpresa?.tax_id || 'N/A'}</p>
                      <p className="text-muted-foreground mt-1.5 font-semibold">Conta:</p>
                      <p className="text-muted-foreground font-mono text-[9px] whitespace-pre-line">
                        {(adjustments.iban || disputeEmpresa?.iban || 'N/A').split('\n')[0]}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold text-[7px] text-slate-400 uppercase">Para</p>
                      <p className="font-bold text-slate-900">{fat.client?.nombre_comercial}</p>
                      <p className="text-muted-foreground">{fat.client?.address_line || 'N/A'}</p>
                      <p className="text-muted-foreground">{[fat.client?.postal_code, fat.client?.city, fat.client?.province].filter(Boolean).join(', ')}</p>
                      <p className="text-muted-foreground mt-1.5">Data Emissão: <span className="font-bold text-slate-700">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                      <p className="text-muted-foreground">Data Vencimento: <span className="font-bold text-slate-700">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                    </div>
                  </div>

                  <div className="bg-orange-500 text-white font-bold uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0 text-[8px]">
                    Lista de Artigos
                  </div>
                  <Table className="border border-slate-200 rounded-b mb-4 text-[10px]">
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-bold text-slate-700 pl-3">Artigo</TableHead>
                        <TableHead className="font-bold text-slate-700">Descrição</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-24">Qtd.</TableHead>
                        <TableHead className="font-bold text-slate-700 w-16">Un.</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-24">Pr. Unitário</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 w-24 pr-3">Valor</TableHead>
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

                  <div className="bg-orange-500 text-white font-bold uppercase tracking-wider px-3 py-1 text-center rounded-t mb-0 text-[8px]">
                    Resumo
                  </div>
                  <Table className="border border-slate-200 rounded-b mb-4 text-[10px]">
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-bold" colSpan={3}>Subtotal da Obra</TableCell>
                        <TableCell className="text-right font-bold w-40 pr-3 font-mono">€ {(totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-bold" colSpan={3}>IVA {adjustments.ivaPct}%</TableCell>
                        <TableCell className="text-right font-bold w-40 pr-3 font-mono">€ {((totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)) * Number(adjustments.ivaPct || 0)/100).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                      <TableRow className="bg-orange-50/50">
                        <TableCell className="font-extrabold text-orange-850" colSpan={3}>Total da Fatura</TableCell>
                        <TableCell className="text-right font-extrabold text-orange-950 text-[11px] pr-3 font-mono">
                          € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  <div className="text-[8px] text-muted-foreground mb-4 font-semibold">
                    Condições de Enquadramento de IVA:<br/>
                    (1) {Number(adjustments.ivaPct) === 0 ? 'M40-IVA - autoliquidação' : 'Regime Geral'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border-t border-slate-200 pt-3 flex justify-between text-[8px] text-muted-foreground font-medium mb-2">
                    <div>
                      <p className="font-bold uppercase mb-0.5">Local de Carga</p>
                      <p>{disputeEmpresa?.address_line || 'N/ Morada'}</p>
                      <p>{[disputeEmpresa?.postal_code, disputeEmpresa?.city].filter(Boolean).join(' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold uppercase mb-0.5">Local de Descarga</p>
                      <p>{fat.client?.address_line || 'V/ Morada'}</p>
                      <p>{[fat.client?.postal_code, fat.client?.city, fat.client?.province].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>

                  <div className="text-center text-[8px] text-slate-700 italic font-semibold mb-2">
                    {disputeEmpresa?.certified_software_text || 'Rexx - Processado por Programa Certificado nº 1123/AT'}
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[35px] bg-[#1a1a1a] text-slate-300 flex items-center justify-between px-6 text-[7px] font-sans rounded-b select-none overflow-hidden">
                  <div className="absolute left-0 bottom-0 top-0 w-16 bg-gradient-to-r from-orange-500 to-transparent opacity-20 skew-x-12 transform origin-bottom-left"></div>
                  <span className="relative z-10 font-medium">
                    Produzido por weoInvoice - Sistema de Facturação Online Gratuito - www.weoinvoice.com
                  </span>
                  <span className="relative z-10 font-bold">
                    ORIGINAL
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
