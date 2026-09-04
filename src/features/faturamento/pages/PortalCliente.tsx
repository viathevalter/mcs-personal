import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getFaturaByToken, aprovarHorasCliente, contestarHorasCliente, publicSupabase } from '../api/faturamentoApi';
import type { Fatura, HoraTrabalhada } from '../api/faturamentoApi';
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle, MessageSquare, Loader2, Calendar, FileSpreadsheet, Check, Paperclip, Trash2, Building2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { getBillingCycleDays } from './FaturasPendentes';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';

// Format helpers
const formatHours = (decimalHours: number) => {
  if (!decimalHours) return '00:00';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
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

export function PortalCliente() {
  const { token: routeToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get('token') || '';
  
  const [loading, setLoading] = useState(true);
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [horas, setHoras] = useState<HoraTrabalhada[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'resumo' | 'informe' | 'factura'>('resumo');
  const [selectedObraId, setSelectedObraId] = useState<string>('all');

  const [editingCell, setEditingCell] = useState<{ workerId: string; dateKey: string } | null>(null);
  const [disputedHours, setDisputedHours] = useState<Record<string, Record<string, number>>>({});
  const [disputeFile, setDisputeFile] = useState<File | null>(null);

  const totalHorasCalculadas = React.useMemo(() => {
    let sum = 0;
    horas.forEach(h => {
      const proposed = disputedHours[h.worker_id]?.[h.data_trabalho];
      sum += proposed !== undefined ? proposed : h.horas_totais;
    });
    return sum;
  }, [horas, disputedHours]);

  useEffect(() => {
    // Force light mode on this page
    const htmlEl = document.documentElement;
    const isDark = htmlEl.classList.contains('dark');
    if (isDark) {
      htmlEl.classList.remove('dark');
    }
    
    return () => {
      // Restore dark mode if it was active
      if (isDark) {
        htmlEl.classList.add('dark');
      }
    };
  }, []);

  useEffect(() => {
    if (token) {
      loadData();
    } else {
      setError("Token inválido.");
      setLoading(false);
    }
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFaturaByToken(token!);
      setFatura(data.fatura);

      // Group and sum duplicate registry records per worker, date, and obra to preserve separate obras
      const groupedMap = new Map<string, any>();
      (data.horas || []).forEach((h: any) => {
        const wId = h.worker_id;
        if (!wId) return;
        const dateKey = h.data_trabalho ? (h.data_trabalho.includes('T') ? h.data_trabalho.split('T')[0] : h.data_trabalho) : '';
        const obraKey = h.obra_id || 'no_obra';
        const key = `${wId}_${dateKey}_${obraKey}`;
        
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            ...h,
            data_trabalho: dateKey,
            horas_totais: 0
          });
        }
        groupedMap.get(key).horas_totais += Number(h.horas_totais || 0);
      });

      setHoras(Array.from(groupedMap.values()));
    } catch (err: any) {
      console.error(err);
      setError("Não foi possível carregar as informações. O link pode ser inválido ou ter expirado.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await aprovarHorasCliente(token!, fatura!.id);
      setSubmittedMessage({
        type: 'success',
        title: '¡Muchas gracias!',
        desc: 'Has aprobado el informe de horas correctamente. Ya puedes descargar los documentos adjuntos en los botones de abajo. La factura oficial te será enviada posteriormente por correo electrónico.'
      });
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al aprobar las horas: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCellEdit = (workerId: string, dateKey: string, hours: number, originalHours: number) => {
    if (isNaN(hours) || hours < 0) return;

    setDisputedHours(prev => {
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
    setEditingCell(null);
  };

  const handleFileUpload = async (file: File, faturaId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `disputa_${Date.now()}.${fileExt}`;
      const filePath = `faturamento/disputas/${faturaId}/${fileName}`;

      const { data, error } = await publicSupabase.storage
        .from('mcs-personal-docs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      
      const { data: { publicUrl } } = publicSupabase.storage
        .from('mcs-personal-docs')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error('Erro ao fazer upload do documento de disputa:', err);
      return null;
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) {
      alert("Por favor, informe o motivo do erro.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      let fileUrl = '';
      if (disputeFile) {
        const uploadedUrl = await handleFileUpload(disputeFile, fatura!.id);
        if (uploadedUrl) {
          fileUrl = uploadedUrl;
        } else {
          alert("Aviso: Falhou o upload do comprovativo, mas enviaremos a contestação.");
        }
      }

      await contestarHorasCliente(token!, fatura!.id, disputeReason, disputedHours, fileUrl);
      setIsDisputeModalOpen(false);
      setSubmittedMessage({
        type: 'error',
        title: 'Informe de Horas en Disputa',
        desc: 'Has solicitado una corrección para este informe de horas. Nuestro equipo comercial está revisando tus comentarios y se pondrá en contacto contigo a la brevedad.'
      });
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al disputar las horas: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMonthName = (mIndex: number) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[mIndex] || '';
  };

  const handleDownloadHoursPDF = async (fatura: any) => {
    setActiveTab('resumo');
    await new Promise(resolve => setTimeout(resolve, 150));
    toast.info("Generando PDF del Registro de Horas...");
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1120px';
    container.style.padding = '40px';
    container.style.background = '#ffffff';
    container.style.color = '#000000';
    container.style.fontFamily = 'Inter, system-ui, sans-serif';
    
const clientName = fatura.client?.legal_name || fatura.client?.razon_social || fatura.client?.nombre_comercial || 'Cliente';
    const periodStr = `${getMonthName(month)} / ${year}`;
    
    const tablesToRender = selectedObraId === 'all' ? groupedObras : groupedObras.filter(o => o.obraId === selectedObraId);

    let overallPageNum = 1;

    tablesToRender.forEach(obra => {
      const workers = obra.workers;
      const firstPageLimit = 13;
      const subsequentPageLimit = 16;

      let currentIndex = 0;
      let tablePageNum = 1;

      while (currentIndex < workers.length) {
        const isFirstPage = tablePageNum === 1;
        const limit = isFirstPage ? firstPageLimit : subsequentPageLimit;
        const chunk = workers.slice(currentIndex, currentIndex + limit);
        const isLastChunk = (currentIndex + limit) >= workers.length;
        currentIndex += limit;

        const pageDiv = document.createElement('div');
        pageDiv.className = 'pdf-page-hours-portal';
        pageDiv.style.width = '1120px';
        pageDiv.style.height = '792px';
        pageDiv.style.padding = '35px 40px';
        pageDiv.style.boxSizing = 'border-box';
        pageDiv.style.background = '#ffffff';
        pageDiv.style.position = 'relative';
        pageDiv.style.display = 'flex';
        pageDiv.style.flexDirection = 'column';

        let headerHtml = '';
        if (isFirstPage) {
          headerHtml = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px;">
              <div>
                <h2 style="font-size: 24px; font-weight: 800; margin: 0; color: #1e293b;">Registro de Horas</h2>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Cliente: <strong>${clientName}</strong> | Periodo: <strong>${periodStr}</strong></p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 13px; color: #64748b; margin: 0;">Total de Horas: <strong style="color: #1e293b; font-size: 16px;">${obra.totalHoras.toFixed(2)}h</strong></p>
                <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Importe Base: <strong style="color: #1e293b; font-size: 16px;">€ ${obra.totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></p>
              </div>
            </div>
            <div style="text-align: center; font-weight: 800; font-size: 13px; letter-spacing: 0.05em; background-color: #f1f5f9; padding: 8px; color: #334155; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e2e8f0;">
              OBRA: ${obra.obraName.toUpperCase()}
            </div>
          `;
        } else {
          headerHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
              <span style="font-size: 12px; font-weight: 700; color: #475569;">Registro de Horas — ${clientName} (OBRA: ${obra.obraName.toUpperCase()})</span>
              <span style="font-size: 11px; color: #64748b;">Periodo: ${periodStr}</span>
            </div>
          `;
        }

        let tableHtml = `
          <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: auto;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 8px 10px; text-align: left; font-weight: 700; color: #475569; border-right: 1px solid #e2e8f0; width: 180px;">Trabajador</th>
        `;

        daysArrayLocal.forEach(dInfo => {
          const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
          const dayOfWeek = cellDate.getDay();
          const isSunday = dayOfWeek === 0;
          const isSaturday = dayOfWeek === 6;
          const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
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
            <th style="text-align: center; padding: 6px 1px; min-width: 22px; ${headerBg} border-right: 1px solid #e2e8f0;">
              <div style="font-size: 7px; text-transform: uppercase; color: ${headerColor}; font-weight: 700; line-height: 1;">${label}</div>
              <div style="font-size: 10px; font-weight: 700; color: #1e293b; margin-top: 2px; line-height: 1;">${String(dInfo.day).padStart(2, '0')}</div>
            </th>
          `;
        });

        tableHtml += `
            <th style="padding: 8px 10px; text-align: right; font-weight: 700; color: #475569; width: 60px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
        `;

        chunk.forEach(w => {
          const workerTotal = daysArrayLocal.reduce((sum, dInfo) => {
            const hourObj = w.horasDiarias[dInfo.dateStr] as any;
            return sum + (hourObj ? Number(hourObj.horas_totais || 0) : 0);
          }, 0);

          tableHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px 10px; font-weight: 600; color: #1e293b; border-right: 1px solid #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${w.workerName}</td>
          `;

          daysArrayLocal.forEach(dInfo => {
            const hourObj = w.horasDiarias[dInfo.dateStr] as any;
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
              <td style="text-align: center; padding: 6px 1px; ${cellBg} ${cellStyle} border-right: 1px solid #e2e8f0; font-size: 10px;">
                ${hoursVal > 0 ? hoursVal : '-'}
              </td>
            `;
          });

          tableHtml += `
              <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #1e293b; font-size: 10px;">${workerTotal.toFixed(1)}h</td>
            </tr>
          `;
        });

        tableHtml += `
            </tbody>
        `;

        if (isLastChunk) {
          tableHtml += `
            <tfoot>
              <tr style="background-color: #f8fafc; font-weight: 750; border-top: 2px solid #e2e8f0;">
                <td style="padding: 6px 10px; font-weight: 700; color: #1e293b; border-right: 1px solid #e2e8f0;">Total ${obra.obraName}</td>
          `;

          daysArrayLocal.forEach(dInfo => {
            const daySum = obra.workers.reduce((sum, w) => {
              const hourObj = w.horasDiarias[dInfo.dateStr] as any;
              return sum + (hourObj ? Number(hourObj.horas_totais || 0) : 0);
            }, 0);
            tableHtml += `
              <td style="text-align: center; padding: 5px 1px; font-weight: 700; color: #1e293b; border-right: 1px solid #e2e8f0; font-size: 9.5px;">
                ${daySum > 0 ? daySum.toFixed(1) : '-'}
              </td>
            `;
          });

          tableHtml += `
                <td style="padding: 6px 10px; text-align: right; font-weight: 800; font-family: monospace; color: #0f172a;">${obra.totalHoras.toFixed(1)}h</td>
              </tr>
            </tfoot>
          `;
        }

        tableHtml += `
          </table>
        `;

        const footerHtml = `
          <div style="margin-top: auto; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 5px;">
            <span>MCS - Gestão Comercial</span>
            <span>Página ${overallPageNum}</span>
          </div>
        `;

        pageDiv.innerHTML = headerHtml + tableHtml + footerHtml;
        container.appendChild(pageDiv);

        tablePageNum++;
        overallPageNum++;
      }
    });

    document.body.appendChild(container);

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pageElements = container.querySelectorAll('.pdf-page-hours-portal');
      
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 1.5,
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
      }

      pdf.save(`registro-horas-${clientName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success("PDF del Registro de Horas generado correctamente!");
    } catch (error: any) {
      console.error("Error al generar PDF:", error);
      toast.error("Error al generar el archivo PDF: " + error.message);
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleDownloadA4PDF = async (cardId: string, clientName: string, type: 'informe' | 'factura') => {
    setActiveTab(type);
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const elementId = `${type}-sheet-${cardId}`;
    const element = document.getElementById(elementId);
    
    if (!element) {
      toast.error(`No se pudo encontrar el elemento visual de la ${type === 'informe' ? 'Pro-forma' : 'Factura'}.`);
      return;
    }
    
    toast.info(`Generando PDF de la ${type === 'informe' ? 'Pro-forma' : 'Factura'}...`);
    
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
      toast.success(`¡PDF de la ${type === 'informe' ? 'Pro-forma' : 'Factura'} generado con éxito!`);
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Error al generar el archivo PDF: " + error.message);
    }
  };

  // Group flat hours by Obra and worker
  const groupedObras = React.useMemo(() => {
    if (!horas || horas.length === 0) return [];

    const obraMap = new Map<string, {
      obraId: string;
      obraName: string;
      totalHoras: number;
      totalValor: number;
      workers: Array<{
        workerId: string;
        workerName: string;
        codColab: string;
        perfil: string;
        tarifa: number;
        totalHoras: number;
        totalValor: number;
        horasDiarias: Record<string, { id?: string; horas_totais: number; data_trabalho: string }>;
      }>;
    }>();

    horas.forEach(h => {
      const oId = h.obra_id || 'sem_obra';
      let oName = h.obra_name;
      if (!oName || oName === 'Sin Obra') {
        oName = fatura?.ajustes_json?.obra || 'Sin Obra';
      }

      if (!obraMap.has(oId)) {
        obraMap.set(oId, {
          obraId: oId,
          obraName: oName,
          totalHoras: 0,
          totalValor: 0,
          workers: []
        });
      }

      const obraGroup = obraMap.get(oId)!;
      if (obraGroup.obraName === 'Sin Obra' && oName && oName !== 'Sin Obra') {
        obraGroup.obraName = oName;
      }

      const wId = h.worker_id;
      if (!wId) return;

      let worker = obraGroup.workers.find(w => w.workerId === wId);
      if (!worker) {
        worker = {
          workerId: wId,
          workerName: h.worker?.nombrecompleto || 'Colaborador',
          codColab: h.worker?.codColab || 'N/A',
          perfil: h.worker?.perfil || 'Não Definido',
          tarifa: h.tarifa_faturada || 27.00,
          totalHoras: 0,
          totalValor: 0,
          horasDiarias: {}
        };
        obraGroup.workers.push(worker);
      }

      const proposed = disputedHours[wId]?.[h.data_trabalho];
      const hoursVal = proposed !== undefined ? proposed : Number(h.horas_totais || 0);

      worker.totalHoras += hoursVal;
      worker.totalValor += hoursVal * (h.tarifa_faturada || 27.00);

      obraGroup.totalHoras += hoursVal;
      obraGroup.totalValor += hoursVal * (h.tarifa_faturada || 27.00);

      const dateKey = h.data_trabalho;
      worker.horasDiarias[dateKey] = {
        id: h.id,
        horas_totais: h.horas_totais,
        data_trabalho: h.data_trabalho
      };
    });

    return Array.from(obraMap.values()).sort((a, b) => a.obraName.localeCompare(b.obraName));
  }, [horas, disputedHours, fatura]);

  const visibleObras = React.useMemo(() => {
    if (selectedObraId === 'all') return groupedObras;
    return groupedObras.filter(o => o.obraId === selectedObraId);
  }, [groupedObras, selectedObraId]);

  // Group flat hours by worker across all obras
  const groupedWorkers = React.useMemo(() => {
    if (!horas || horas.length === 0) return [];
    
    const workersMap = new Map<string, {
      workerId: string;
      workerName: string;
      codColab: string;
      perfil: string;
      tarifa: number;
      totalHoras: number;
      totalValor: number;
      horasDiarias: Record<string, { id?: string; horas_totais: number; data_trabalho: string }>;
    }>();

    groupedObras.forEach(o => {
      o.workers.forEach(w => {
        if (!workersMap.has(w.workerId)) {
          workersMap.set(w.workerId, { ...w, horasDiarias: { ...w.horasDiarias } });
        } else {
          const existing = workersMap.get(w.workerId)!;
          existing.totalHoras += w.totalHoras;
          existing.totalValor += w.totalValor;
          Object.assign(existing.horasDiarias, w.horasDiarias);
        }
      });
    });

    return Array.from(workersMap.values());
  }, [groupedObras]);

  const { year, month } = React.useMemo(() => {
    if (horas && horas.length > 0) {
      const firstDate = horas[0].data_trabalho;
      const parts = firstDate.split('-');
      return { year: parseInt(parts[0]), month: parseInt(parts[1]) - 1 };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [horas]);

  const daysArray = React.useMemo(() => {
    const cycleStartDay = fatura?.client?.billingCycleStartDay || 1;
    return getBillingCycleDays(cycleStartDay, year, month);
  }, [year, month, fatura]);

  const { finalTotalVal, adjustments, dataEmissaoStr, dataVencimentoStr, totalBaseVal } = React.useMemo(() => {
    const totalBaseVal = groupedWorkers.reduce((sum, w) => sum + w.totalValor, 0);

    const adj = fatura?.ajustes_json || {};
    const incrementos = Number(adj.incrementos || 0);
    const reducoes = Number(adj.reducoes || 0);
    const ivaPct = Number(adj.iva_pct || 0);
    const finalTotalVal = (totalBaseVal + incrementos - reducoes) * (1 + ivaPct / 100);

    const termName = fatura?.client?.paymentTermName || 'Pronto Pagamento';
    const expectedTermDays = fatura?.client?.paymentTermDays ?? 0;

    const dataEmissaoStr = fatura?.data_emissao || new Date().toISOString().split('T')[0];
    
    const emissionDate = new Date(dataEmissaoStr + 'T00:00:00');
    const dueDate = new Date(emissionDate.getTime());
    dueDate.setDate(emissionDate.getDate() + expectedTermDays);
    const dataVencimentoStr = adj.data_vencimento || dueDate.toISOString().split('T')[0];

    const defaultIban = fatura?.empresa?.bankDetails || (fatura?.empresa?.iban ? `IBAN: ${fatura.empresa.iban}` : "NIB: PT50 0018 000365089609020 15\nBanco Santander\nSWIFT: TOTAPPTPL");
    let ibanVal = adj.iban;
    if (!ibanVal || (fatura?.empresa?.bankDetails && (!ibanVal.includes('\n') || ibanVal.startsWith('IBAN:')))) {
      ibanVal = fatura?.empresa?.bankDetails || defaultIban;
    }

    const defaultObraTitle = fatura?.ajustes_json?.obra || (groupedObras.length === 1 ? groupedObras[0].obraName : (groupedObras.length > 1 ? 'Múltiplas Obras' : 'Sin Obra'));

    return {
      totalBaseVal,
      finalTotalVal,
      dataEmissaoStr,
      dataVencimentoStr,
      adjustments: {
        incrementos,
        incrementosDesc: adj.incrementos_desc || '',
        reducoes,
        reducoesDesc: adj.reducoes_desc || '',
        ivaPct,
        iban: ibanVal,
        condicoesPagamento: adj.condicoes_pagamento || termName,
        descricaoServico: adj.descricao_servico || `Prestação de Serviços - Obra: ${defaultObraTitle}`,
      }
    };
  }, [fatura, groupedWorkers, groupedObras]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center text-slate-500">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
          <p className="text-lg font-medium">Carregando informações...</p>
        </div>
      </div>
    );
  }

  if (error || !fatura) {
    const isDraftToken = token === 'draft' || !token;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-amber-100">
          <CardHeader className="text-center">
            <div className={`mx-auto p-3 rounded-full w-16 h-16 flex items-center justify-center mb-4 ${isDraftToken ? 'bg-amber-100' : 'bg-red-100'}`}>
              <AlertTriangle className={`w-8 h-8 ${isDraftToken ? 'text-amber-600' : 'text-red-600'}`} />
            </div>
            <CardTitle className={`text-xl ${isDraftToken ? 'text-amber-800' : 'text-red-800'}`}>
              {isDraftToken ? 'Link de Validação em Rascunho' : 'Acesso Inválido'}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {isDraftToken 
                ? "Esta fatura está em rascunho e aguarda a emissão do link de aprovação pelo departamento financeiro." 
                : (error || "Não foi possível carregar as informações. O link pode ser inválido ou ter expirado.")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isResolved = fatura.status === 'approved' || fatura.status === 'invoice_sent' || fatura.status === 'disputed';

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex py-10 px-2 sm:px-4 lg:px-6 font-sans text-left">
      <div className="max-w-[98%] lg:max-w-[1550px] mx-auto w-full space-y-6">
        
        {/* Premium Header Card */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl border border-slate-800/80 mb-6">
          {/* Subtle background gradient and blur spots */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 opacity-90" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-500/30">
                  Portal del Cliente
                </span>
                {(fatura.status === 'approved' || fatura.status === 'invoice_sent') && (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-500/30">
                    Aprobado
                  </span>
                )}
                {fatura.status === 'disputed' && (
                  <span className="bg-rose-500/20 text-rose-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-rose-500/30">
                    En Disputa
                  </span>
                )}
                {fatura.status === 'pending_client_approval' && (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-500/30">
                    Esperando su Revisión
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Revisión de Horas y Facturación</h1>
              <p className="text-sm text-slate-300">
                Cliente: <span className="font-bold text-white">{fatura.client?.legal_name || fatura.client?.razon_social || fatura.client?.nombre_comercial || 'Cliente'}</span>
              </p>
            </div>
            
            <div className="flex gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-sm self-stretch md:self-auto justify-around">
              <div className="text-left px-2">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total de Horas</span>
                <span className="text-xl font-black text-white">{totalHorasCalculadas.toFixed(2)}h</span>
              </div>
              <div className="w-px bg-slate-850 self-stretch" />
              <div className="text-left px-2">
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total a Facturar</span>
                <span className="text-xl font-black text-blue-400">€ {finalTotalVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* State Banner: Approved Case (Shows download attachments) */}
        {(fatura.status === 'approved' || fatura.status === 'invoice_sent') && (
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-3xl p-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm">
            <div className="flex items-start gap-4 text-left">
              <CheckCircle className="w-10 h-10 text-emerald-600 shrink-0 mt-1" />
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-300">
                  ¡Muchas gracias!
                </h3>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 leading-relaxed">
                  Has aprobado el informe de horas correctamente. Ya puedes descargar los documentos adjuntos (informe de horas, pro-forma y factura única) en los botones de la derecha. La factura oficial te será enviada posteriormente por correo electrónico.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 shrink-0 w-full md:w-auto">
              <Button
                variant="outline"
                className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-250 hover:border-emerald-350 font-bold flex items-center justify-center gap-2 h-11 px-4 rounded-xl shadow-sm text-xs transition-colors"
                onClick={() => handleDownloadHoursPDF(fatura)}
              >
                <Calendar className="w-4 h-4" />
                Descargar Registro de Horas
              </Button>
              <Button
                variant="outline"
                className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-250 hover:border-emerald-350 font-bold flex items-center justify-center gap-2 h-11 px-4 rounded-xl shadow-sm text-xs transition-colors"
                onClick={() => handleDownloadA4PDF(fatura.id, fatura.client?.legal_name || fatura.client?.razon_social || fatura.client?.nombre_comercial || 'cliente', 'informe')}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Descargar Pro-forma
              </Button>
              <Button
                variant="outline"
                className="bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-250 hover:border-emerald-350 font-bold flex items-center justify-center gap-2 h-11 px-4 rounded-xl shadow-sm text-xs transition-colors"
                onClick={() => handleDownloadA4PDF(fatura.id, fatura.client?.legal_name || fatura.client?.razon_social || fatura.client?.nombre_comercial || 'cliente', 'factura')}
              >
                <FileText className="w-4 h-4" />
                Descargar Factura Única
              </Button>
            </div>
          </div>
        )}

        {/* State Banner: Disputed Case */}
        {fatura.status === 'disputed' && (
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-3xl p-6 flex items-start gap-4 text-left shadow-sm">
            <AlertTriangle className="w-10 h-10 text-rose-600 shrink-0 mt-1" />
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-rose-900 dark:text-rose-300">
                Informe de Horas en Disputa
              </h3>
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 leading-relaxed">
                Has solicitado una corrección para este informe de horas. Nuestro equipo comercial está revisando tus comentarios y se pondrá en contacto contigo a la brevedad.
              </p>
            </div>
          </div>
        )}

        {submittedMessage && !isResolved && (
          <div className={`p-6 rounded-xl border shadow-sm ${submittedMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800'}`}>
            <div className="flex items-start gap-4">
              {submittedMessage.type === 'success' ? (
                <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
              )}
              <div>
                <h3 className={`text-lg font-semibold ${submittedMessage.type === 'success' ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                  {submittedMessage.title}
                </h3>
                <p className={`mt-1 ${submittedMessage.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {submittedMessage.desc}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons at the Top Fold */}
        {!isResolved && horas.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button 
              size="lg" 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all border-none h-12 text-sm font-bold rounded-xl"
              onClick={handleApprove}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle className="w-5 h-5 mr-2" />}
              Aprobar Informe de Horas
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="flex-1 border border-red-200 text-red-700 bg-white hover:bg-red-50 hover:text-red-800 hover:border-red-300 transition-all h-12 text-sm font-bold rounded-xl"
              onClick={() => setIsDisputeModalOpen(true)}
              disabled={isSubmitting}
            >
              <XCircle className="w-5 h-5 mr-2" />
              Disputar / Solicitar Corrección
            </Button>
          </div>
        )}

        {/* Summary Card with Tab Navigation */}
        <Card className="shadow-md border-slate-200 dark:border-slate-800 overflow-hidden dark:bg-slate-900">
          <div className="bg-slate-900 p-5 text-white flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800">
            <div>
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Referencia Factura</p>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-lg font-bold">#{fatura.id.split('-')[0].toUpperCase()}</span>
              </div>
            </div>
            <div className="text-left md:text-right">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-0.5">Fecha de Emisión</p>
              <div className="flex items-center md:justify-end gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold">{fatura.data_emissao ? new Date(fatura.data_emissao).toLocaleDateString('es-ES') : '--/--/----'}</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation with Icons */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 gap-2 overflow-x-auto text-xs font-semibold">
            <button 
              onClick={() => setActiveTab('resumo')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold ${activeTab === 'resumo' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-105 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              <Calendar className="w-4 h-4" />
              Resumen de Horas (Control de Presencia)
            </button>
            <button 
              onClick={() => setActiveTab('informe')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold ${activeTab === 'informe' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-105 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Informe Pro-forma
            </button>
            <button 
              onClick={() => setActiveTab('factura')} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold ${activeTab === 'factura' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-105 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            >
              <FileText className="w-4 h-4" />
              Factura Única AT
            </button>
          </div>
          
          <CardContent className="p-0">
            {/* Aba: Resumo (Folha de Ponto Horizontal) */}
            {activeTab === 'resumo' && (
              <div className="p-6 bg-white overflow-x-auto text-xs">
                <div className="mb-4 flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Informe de Horas</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Cliente: <span className="font-semibold text-slate-800">{fatura.client?.legal_name || fatura.client?.razon_social || fatura.client?.nombre_comercial || 'Cliente'}</span> | Período: <span className="font-semibold text-slate-800">{getMonthName(month)} / {year}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-500">Total de Horas: <span className="text-slate-900 font-bold">{totalHorasCalculadas.toFixed(2)}h</span></p>
                  </div>
                </div>

                {/* Filtro de Obras (se houver mais de uma obra) */}
                {groupedObras.length > 1 && (
                  <div className="mb-6 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Filtrar por Obra / Centro de Coste:
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant={selectedObraId === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedObraId('all')}
                        className={`h-9 px-3 text-xs font-bold rounded-lg transition-all ${
                          selectedObraId === 'all'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5 mr-1.5" />
                        Todas las Obras ({totalHorasCalculadas.toFixed(2)}h • € {totalBaseVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })})
                      </Button>
                      {groupedObras.map((obra) => (
                        <Button
                          key={obra.obraId}
                          type="button"
                          variant={selectedObraId === obra.obraId ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedObraId(obra.obraId)}
                          className={`h-9 px-3 text-xs font-bold rounded-lg transition-all ${
                            selectedObraId === obra.obraId
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                          {obra.obraName} ({obra.totalHoras.toFixed(2)}h • € {obra.totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })})
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tabelas por Obra */}
                {visibleObras.map((obra) => (
                  <div key={obra.obraId} className="mb-8 last:mb-0">
                    <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/90 px-4 py-2.5 rounded-lg mb-3 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 tracking-wider uppercase">
                          OBRA: {obra.obraName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium ml-1">
                          ({obra.workers.length} {obra.workers.length === 1 ? 'colaborador' : 'colaboradores'})
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          Horas Obra: <strong className="text-slate-900 dark:text-white font-bold">{obra.totalHoras.toFixed(2)}h</strong>
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          Subtotal: <strong className="text-blue-600 dark:text-blue-400 font-bold font-mono">€ {obra.totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
                        </span>
                      </div>
                    </div>

                    <Table className="border border-slate-200 rounded-lg">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold pl-4">Trabajador</TableHead>
                          {daysArray.map(dInfo => {
                            const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
                            const dayOfWeek = cellDate.getDay();
                            const isWk = dayOfWeek === 0 || dayOfWeek === 6;
                            const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                            const wDay = weekdays[dayOfWeek];
                            return (
                              <TableHead key={dInfo.dateStr} className={`text-center font-extrabold text-[9px] md:text-[10px] p-1 min-w-[28px] max-w-[38px] ${isWk ? 'bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-x border-slate-100 dark:border-slate-800' : 'border-x border-slate-100 dark:border-slate-850'}`}>
                                <div className="flex flex-col items-center gap-0.5">
                                  <span>{String(dInfo.day).padStart(2, '0')}</span>
                                  <span className="text-[6.5px] md:text-[7.5px] text-slate-400 font-normal uppercase tracking-tight">{wDay}</span>
                                </div>
                              </TableHead>
                            );
                          })}
                          <TableHead className="text-right font-extrabold pr-4 text-xs">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {obra.workers.map(worker => {
                          const workerTotal = daysArray.reduce((sum, dInfo) => {
                            const dateKey = dInfo.dateStr;
                            const proposedVal = disputedHours[worker.workerId]?.[dateKey];
                            if (proposedVal !== undefined) return sum + proposedVal;
                            const hourObj = worker.horasDiarias[dateKey] as any;
                            return sum + (hourObj ? Number(hourObj.horas_totais || 0) : 0);
                          }, 0);

                          return (
                            <TableRow key={worker.workerId} className="hover:bg-slate-50 transition-colors">
                              <TableCell className="font-semibold text-slate-800 pl-4 py-3 text-xs">{worker.workerName}</TableCell>
                              {daysArray.map(dInfo => {
                                const dateKey = dInfo.dateStr;
                                const hourObj = worker.horasDiarias[dateKey] as any;
                                const hoursVal = hourObj ? Number(hourObj.horas_totais || 0) : 0;

                                const isEditing = editingCell?.workerId === worker.workerId && editingCell?.dateKey === dateKey;
                                const proposedVal = disputedHours[worker.workerId]?.[dateKey];
                                const hasDispute = proposedVal !== undefined;
                                const displayVal = hasDispute ? proposedVal : hoursVal;
                                
                                const cellDate = new Date(dInfo.year, dInfo.month - 1, dInfo.day);
                                const dayOfWeek = cellDate.getDay();
                                const isWk = dayOfWeek === 0 || dayOfWeek === 6;

                                if (isEditing) {
                                  return (
                                    <TableCell key={dInfo.dateStr} className="p-0 text-center min-w-[30px] border-x border-slate-100 dark:border-slate-800">
                                      <input 
                                        type="number" 
                                        step="0.5" 
                                        min="0" 
                                        max="24" 
                                        defaultValue={displayVal || 0} 
                                        className="w-9 h-7 text-center text-xs p-0 border border-blue-500 rounded bg-blue-50 text-blue-900 font-extrabold focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm" 
                                        onBlur={(e) => handleCellEdit(worker.workerId, dateKey, Number(e.target.value), hoursVal)} 
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleCellEdit(worker.workerId, dateKey, Number((e.target as HTMLInputElement).value), hoursVal);
                                          } else if (e.key === 'Escape') {
                                            setEditingCell(null);
                                          }
                                        }} 
                                        autoFocus 
                                      />
                                    </TableCell>
                                  );
                                }

                                return (
                                  <TableCell 
                                    key={dInfo.dateStr} 
                                    onClick={() => !isResolved && setEditingCell({ workerId: worker.workerId, dateKey })} 
                                    className={`text-center p-1 text-[10px] md:text-[11px] min-w-[28px] max-w-[38px] select-none cursor-pointer transition-all border-x border-slate-100 dark:border-slate-850 ${
                                      isResolved 
                                        ? 'cursor-default' 
                                        : 'hover:bg-amber-100 hover:text-amber-850 dark:hover:bg-slate-800'
                                    } ${
                                      isWk
                                        ? hasDispute
                                          ? 'bg-amber-100/80 dark:bg-amber-950/30 font-extrabold text-blue-650'
                                          : hoursVal > 0
                                            ? 'bg-rose-100/40 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 font-extrabold'
                                            : 'bg-rose-50/25 dark:bg-rose-950/5 text-slate-300'
                                        : hasDispute
                                          ? 'bg-amber-50 dark:bg-amber-950/20 font-extrabold text-blue-650'
                                          : hoursVal > 0
                                            ? 'bg-blue-50/20 dark:bg-slate-800/10 font-bold text-slate-800 dark:text-slate-200'
                                            : 'text-slate-300'
                                    }`}
                                  >
                                    {hasDispute ? (
                                      <div className="flex flex-col items-center leading-none py-0.5">
                                        <span className="line-through text-red-500 text-[8px]">{hoursVal}</span>
                                        <span className="font-extrabold text-blue-650 text-[10px]">{proposedVal}</span>
                                      </div>
                                    ) : (
                                      <span>
                                        {hoursVal > 0 ? hoursVal : '-'}
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
                      <TableFooter className="bg-slate-50/80 dark:bg-slate-850/80 font-bold border-t border-slate-200">
                        <TableRow>
                          <TableCell className="font-bold pl-4 py-2.5 text-xs text-slate-800 dark:text-slate-200">
                            Total {obra.obraName}
                          </TableCell>
                          {daysArray.map(dInfo => {
                            const daySum = obra.workers.reduce((sum, w) => {
                              const proposedVal = disputedHours[w.workerId]?.[dInfo.dateStr];
                              if (proposedVal !== undefined) return sum + proposedVal;
                              const hourObj = w.horasDiarias[dInfo.dateStr] as any;
                              return sum + (hourObj ? Number(hourObj.horas_totais || 0) : 0);
                            }, 0);
                            return (
                              <TableCell key={dInfo.dateStr} className="text-center p-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 border-x border-slate-100 dark:border-slate-800">
                                {daySum > 0 ? daySum.toFixed(1) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-black pr-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 font-mono">
                            {obra.totalHoras.toFixed(1)}h
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                ))}

                {/* Resumo Global quando há mais de 1 obra e visualizando todas */}
                {visibleObras.length > 1 && (
                  <div className="mt-6 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-400" />
                      <span className="font-extrabold text-sm uppercase tracking-wide">
                        Resumen Global ({visibleObras.length} Obras)
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span>Total Horas: <strong className="font-mono text-base font-black text-white">{totalHorasCalculadas.toFixed(2)}h</strong></span>
                      <span>Importe Base: <strong className="font-mono text-base font-black text-blue-400">€ {totalBaseVal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Aba: Informe */}
            {activeTab === 'informe' && (
              <div className="p-8 bg-slate-100 flex justify-center text-xs">
                <div id={`informe-sheet-${fatura.id}`} className="w-full max-w-[800px] bg-white p-8 shadow border border-slate-200 text-slate-800 rounded text-left">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
                    <div className="space-y-2">
                      {fatura.empresa?.invoiceLogoUrl ? (
                        <div className="h-14 flex items-center mb-2">
                          <img src={fatura.empresa.invoiceLogoUrl} alt={fatura.empresa.nome} className="max-h-full max-w-[220px] object-contain" />
                        </div>
                      ) : (
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                          {fatura.empresa?.nome || 'STOCCO'}
                        </h3>
                      )}
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Informe de Facturación</p>
                      <p className="text-[9px] text-muted-foreground">MCS - Gestão Comercial</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-slate-500 uppercase text-[9px]">Documento</p>
                      <p className="font-bold text-slate-900">IF-{year}/{String(fatura.fatura_numero || fatura.empresa?.nextInvoiceNumber || '0001').padStart(4, '0')}</p>
                      <p className="text-muted-foreground mt-2">Emissão: <span className="font-semibold text-slate-700">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                      <p className="text-muted-foreground">Vencimento: <span className="font-semibold text-slate-700">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</span></p>
                    </div>
                  </div>

                  {/* Emissor e Cliente */}
                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1">
                      <p className="font-bold text-slate-400 uppercase text-[8px] mb-0.5">Emissor</p>
                      <p className="font-bold text-slate-955">{fatura.empresa?.nome || 'STOCCO LDA'}</p>
                      <p className="text-slate-600">CIF/NIF: {fatura.empresa?.taxId || 'PT517834747'}</p>
                      <p className="text-slate-600">{fatura.empresa?.addressLine || 'Rua Padre António Maria Pinho, n.º 353'}</p>
                      <p className="text-slate-600">
                        {[fatura.empresa?.postalCode || '4460-853', fatura.empresa?.city || 'Vila Nova de Gaia'].filter(Boolean).join(' ')}
                      </p>
                      <p className="text-slate-600">{fatura.empresa?.province || 'Portugal'}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-1">
                      <p className="font-bold text-slate-400 uppercase text-[8px] mb-0.5">Cliente</p>
                      <p className="font-bold text-slate-955">{fatura.client?.legal_name || fatura.client?.razon_social || fatura.client?.nombre_comercial || 'Cliente'}</p>
                      <p className="text-slate-600">NIF: {fatura.client?.tax_id || 'N/A'}</p>
                      <p className="text-slate-600">{fatura.client?.address_line || 'N/A'}</p>
                      <p className="text-slate-600">
                        {[fatura.client?.postal_code, fatura.client?.city].filter(Boolean).join(' ')}
                      </p>
                      <p className="text-slate-600">{fatura.client?.province || 'Espanha'}</p>
                    </div>
                  </div>

                  {/* Resumo de Importe */}
                  <h5 className="font-bold uppercase text-slate-400 tracking-wider mb-2 text-[10px]">Resumen de Importe</h5>
                  <Table className="border border-slate-100 rounded mb-6">
                    <TableHeader className="bg-slate-50">
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
                      <TableRow className="bg-slate-50">
                        <TableCell className="font-bold text-slate-800" colSpan={3}>Total a facturar</TableCell>
                        <TableCell className="text-right font-extrabold text-slate-900 font-mono">
                          € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Relação de Trabalhadores por Obra */}
                  {visibleObras.map((obra) => (
                    <div key={obra.obraId} className="mb-6">
                      <div className="flex justify-between items-center bg-slate-100 py-1.5 px-3 rounded text-slate-700 mb-2 border border-slate-200">
                        <span className="font-bold text-xs uppercase tracking-wider">
                          OBRA: {obra.obraName.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600">
                          {obra.totalHoras.toFixed(2)}h • € {obra.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <Table className="border border-slate-100 rounded mb-4">
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="font-bold pl-4">Trabajador</TableHead>
                            <TableHead className="text-right font-bold w-40">Cantidad de horas</TableHead>
                            <TableHead className="text-right font-bold w-40">Precio hora (€)</TableHead>
                            <TableHead className="text-right font-bold w-40 pr-4">Total (€)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {obra.workers.map(w => (
                            <TableRow key={w.workerId}>
                              <TableCell className="font-semibold text-slate-800 pl-4">{w.workerName}</TableCell>
                              <TableCell className="text-right font-medium">{w.totalHoras.toFixed(2)}h</TableCell>
                              <TableCell className="text-right font-medium">€ {w.tarifa.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-bold pr-4 font-mono">€ {w.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="bg-slate-50 font-bold border-t border-slate-200">
                            <TableCell className="font-bold pl-4">Subtotal {obra.obraName}</TableCell>
                            <TableCell className="text-right font-bold">{obra.totalHoras.toFixed(2)}h</TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right font-extrabold pr-4 font-mono">€ {obra.totalValor.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ))}

                  {visibleObras.length > 1 && (
                    <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center font-bold text-slate-900 border border-slate-200 mb-6">
                      <span>Total General ({visibleObras.length} Obras)</span>
                      <span className="font-mono">
                        {visibleObras.reduce((sum, o) => sum + o.totalHoras, 0).toFixed(2)}h • € {visibleObras.reduce((sum, o) => sum + o.totalValor, 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  {/* Informações Bancárias */}
                  <div className="border-t border-slate-100 pt-6 text-muted-foreground space-y-1 whitespace-pre-line font-medium leading-relaxed">
                    <span className="font-bold uppercase text-slate-400 text-[8px] block mb-1">Dados de Depósito / IBAN</span>
                    {adjustments.iban}
                  </div>
                </div>
              </div>
            )}

            {/* Aba: Factura Única */}
            {activeTab === 'factura' && (
              <div className="p-8 bg-slate-100 flex flex-col items-center gap-4 text-xs">
                {/* Folha A4 da Fatura */}
                <div id={`factura-sheet-${fatura.id}`} className="w-full max-w-[800px] h-[1130px] bg-white p-8 pb-20 border border-slate-200 text-slate-800 rounded text-left relative flex flex-col justify-between select-none shadow-md">
                  
                  {/* Wrapper do conteúdo flex-1 */}
                  <div className="flex-1">
                    {fatura?.ajustes_json?.obra ? (
                      <div className="text-center font-bold text-xs bg-slate-100 py-1.5 rounded text-slate-700 mb-6 border border-slate-200">
                        OBRA: {fatura.ajustes_json.obra.toUpperCase()}
                      </div>
                    ) : groupedObras.length === 1 ? (
                      <div className="text-center font-bold text-xs bg-slate-100 py-1.5 rounded text-slate-700 mb-6 border border-slate-200">
                        OBRA: {groupedObras[0].obraName.toUpperCase()}
                      </div>
                    ) : groupedObras.length > 1 ? (
                      <div className="text-center font-bold text-xs bg-slate-100 py-1.5 rounded text-slate-700 mb-6 border border-slate-200">
                        OBRAS: {groupedObras.map(o => o.obraName.toUpperCase()).join(' • ')}
                      </div>
                    ) : null}

                    {/* Top row */}
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 font-sans tracking-tight">
                          {fatura.fatura_numero || `Factura nº${fatura.empresa?.invoiceSeries || '1'} ${new Date().getFullYear()}/${fatura.empresa?.nextInvoiceNumber || 1}`}
                        </h3>
                        <p className="text-xs font-bold text-slate-950 mt-1 uppercase tracking-wider">ORIGINAL</p>
                      </div>
                      {/* QR Code dinâmico */}
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[9px] font-bold text-slate-700 font-sans">
                          ATCUD: {fatura.atcud || `${fatura.empresa?.atcudPrefix || 'J6XBVVRV'}-${fatura.empresa?.nextInvoiceNumber || 1}`}
                        </span>
                        <div className="border border-slate-200 p-1.5 bg-white rounded shadow-sm">
                          <QRCodeSVG
                            value={`${window.location.origin}/aprovacao-cliente/${token}`}
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
                        <p className="font-bold text-slate-900">{fatura.empresa?.nome || 'STOCCO LDA'}</p>
                        <p className="text-slate-600">{fatura.empresa?.addressLine || 'Rua Padre António Maria Pinho, n.º 353'}</p>
                        <p className="text-slate-600">
                          {[fatura.empresa?.postalCode || '4460-853', fatura.empresa?.city || 'Vila Nova de Gaia'].filter(Boolean).join(' ')}
                        </p>
                        <p className="text-slate-600">{fatura.empresa?.province || 'Portugal'}</p>
                        {fatura.empresa?.email && <p className="text-slate-600">{fatura.empresa?.email}</p>}
                        <p className="text-slate-600">Nº Contribuinte: {fatura.empresa?.taxId || 'PT517834747'}</p>
                        {fatura.empresa?.capitalSocial && <p className="text-slate-600">Capital Social: {fatura.empresa?.capitalSocial}</p>}
                        {fatura.empresa?.conservatoria && <p className="text-slate-600">Cons. Reg. Com.: {fatura.empresa?.conservatoria}</p>}
                        {fatura.empresa?.matricula && <p className="text-slate-600">Matrícula: {fatura.empresa?.matricula}</p>}
                      </div>

                      {/* Coluna 2: Detalhes */}
                      <div>
                        <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mb-1">ATCUD</p>
                        <p className="font-semibold text-slate-900">
                          {fatura.atcud || `${fatura.empresa?.atcudPrefix || 'J6XBVVRV'}-${fatura.empresa?.nextInvoiceNumber || 1}`}
                        </p>
                        
                        <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mt-3">Data de Emissão</p>
                        <p className="text-slate-700">{new Date(dataEmissaoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                        
                        <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mt-3">Data de Vencimento</p>
                        <p className="text-slate-700">{new Date(dataVencimentoStr + 'T00:00:00').toLocaleDateString('pt-PT')}</p>
                      </div>
                                               
                      {/* Coluna 3: Para */}
                      <div>
                        <p className="font-bold text-[9px] text-[#ec8a5e] uppercase mb-1">Para</p>
                        <p className="font-bold text-slate-900">{fatura.client?.legal_name || fatura.client?.razon_social || fatura.client?.nombre_comercial || 'Cliente'}</p>
                        <p className="text-slate-600">{fatura.client?.address_line || 'N/A'}</p>
                        <p className="text-slate-600">
                          {[fatura.client?.postal_code, fatura.client?.city].filter(Boolean).join(' ')}
                        </p>
                        <p className="text-slate-600">{fatura.client?.province || 'Espanha'}</p>
                        <p className="text-slate-600 mt-2">Nº Contribuinte: {fatura.client?.tax_id || 'N/A'}</p>
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
                        <tr className="border-b border-[#ec8a5e]/30 text-slate-800">
                          <td className="pl-3 py-1">{adjustments.descricaoServico || 'Prestação de Serviços'}</td>
                          <td className="text-right py-1">{totalHorasCalculadas.toFixed(2)}</td>
                          <td className="text-right py-1">{(totalBaseVal / (totalHorasCalculadas || 1)).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="text-right py-1">0,00</td>
                          <td className="text-right py-1">{Number(adjustments.ivaPct || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
                          <td className="text-right font-bold pr-3 font-mono py-1">{totalBaseVal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        {Number(adjustments.incrementos) > 0 && (
                          <tr className="border-b border-[#ec8a5e]/30 text-emerald-700">
                            <td className="pl-3 py-1">{adjustments.incrementosDesc || 'Incremento Adicional'}</td>
                            <td className="text-right py-1">1.00</td>
                            <td className="text-right py-1">{Number(adjustments.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="text-right py-1">0,00</td>
                            <td className="text-right py-1">{Number(adjustments.ivaPct || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
                            <td className="text-right font-bold pr-3 font-mono py-1">{Number(adjustments.incrementos).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        )}
                        {Number(adjustments.reducoes) > 0 && (
                          <tr className="border-b border-[#ec8a5e]/30 text-rose-700">
                            <td className="pl-3 py-1">{adjustments.reducoesDesc || 'Redução Comercial'}</td>
                            <td className="text-right py-1">1.00</td>
                            <td className="text-right py-1">-{Number(adjustments.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="text-right py-1">0,00</td>
                            <td className="text-right py-1">{Number(adjustments.ivaPct || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} (1)</td>
                            <td className="text-right font-bold pr-3 font-mono py-1">-{Number(adjustments.reducoes).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                        <tr className="border-b border-[#ec8a5e]/30 text-slate-800">
                          <td className="font-bold pl-3 py-1" colSpan={3}>Subtotal da Obra</td>
                          <td className="text-right font-bold w-40 pr-3 font-mono py-1">€ {(totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-b border-[#ec8a5e]/30 text-slate-800">
                          <td className="font-bold pl-3 py-1" colSpan={3}>IVA {adjustments.ivaPct}%</td>
                          <td className="text-right font-bold w-40 pr-3 font-mono py-1">€ {((totalBaseVal + Number(adjustments.incrementos || 0) - Number(adjustments.reducoes || 0)) * Number(adjustments.ivaPct || 0)/100).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="bg-[#fef7f2] text-slate-900">
                          <td className="font-extrabold text-[#ec8a5e] pl-3 py-1.5" colSpan={3}>Total da Fatura</td>
                          <td className="text-right font-extrabold text-[#9c4d28] text-xs pr-3 font-mono py-1.5">
                            € {finalTotalVal.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Condições de IVA */}
                    <div className="text-[9px] text-slate-500 mb-6 leading-relaxed font-semibold">
                      Condições de Enquadramento de IVA:<br/>
                      (1) M09-IVA - autoliquidação
                    </div>

                    {/* Informações Bancárias */}
                    <div className="border-t border-slate-100 pt-6 text-[11px] text-slate-500 space-y-1 whitespace-pre-line font-medium leading-relaxed mb-6">
                      <span className="font-bold uppercase text-slate-400 text-[9px] block mb-1">Dados de Depósito / IBAN</span>
                      {adjustments.iban}
                    </div>

                    {/* Rodapé da fatura */}
                    <div className="border-t border-slate-100 pt-4 flex justify-between text-[9px] text-slate-500 font-medium">
                      <div>
                        <p className="font-bold uppercase mb-0.5">Local de Carga</p>
                        <p>{fatura.empresa?.addressLine || 'Rua Padre António Maria Pinho, n.º 353'}</p>
                        <p>{[fatura.empresa?.postalCode || '4460-853', fatura.empresa?.city || 'Vila Nova de Gaia'].filter(Boolean).join(' ')}</p>
                        <p>{fatura.empresa?.province || 'Portugal'}</p>
                      </div>
                      {adjustments.iban && (
                        <div className="text-center">
                          <p className="font-bold uppercase mb-0.5">Informações de Pagamento</p>
                          <div className="font-mono text-[9px] whitespace-pre-line leading-tight">{adjustments.iban}</div>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="font-bold uppercase mb-0.5">Local de Descarga</p>
                        <p>{fatura.client?.address_line || 'N/A'}</p>
                        <p>{[fatura.client?.postal_code, fatura.client?.city].filter(Boolean).join(' ')}</p>
                        <p>{fatura.client?.province || 'Espanha'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-[7px] text-slate-400 mt-4 italic font-semibold">
                    Rexx - Processado por Programa Certificado nº 1123/AT
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Dispute Modal */}
        <Dialog open={isDisputeModalOpen} onOpenChange={setIsDisputeModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-red-700">
                <AlertTriangle className="w-6 h-6" />
                Contestar Horas
              </DialogTitle>
              <DialogDescription className="text-base pt-2">
                Por favor, explique o motivo da contestação e anexe um comprovativo se necessário. Você também pode alterar as horas na planilha antes de enviar.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {Object.keys(disputedHours).length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900 rounded-xl space-y-2 text-xs">
                  <p className="font-bold text-amber-800 dark:text-amber-300">Alterações propostas na planilha:</p>
                  <div className="max-h-[120px] overflow-y-auto space-y-1">
                    {Object.keys(disputedHours).map(workerId => {
                      const worker = groupedWorkers.find(w => w.workerId === workerId);
                      const dates = disputedHours[workerId];
                      return (
                        <div key={workerId} className="border-b border-amber-100 dark:border-amber-900/40 pb-1 last:border-0">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{worker?.workerName || 'Colaborador'}:</span>
                          <div className="pl-2 space-y-0.5 mt-0.5">
                            {Object.keys(dates).map(dateKey => {
                              const [y, m, d] = dateKey.split('-');
                              const originalHObj = worker?.horasDiarias[dateKey] as any;
                              const originalHours = originalHObj ? Number(originalHObj.horas_totais) : 0;
                              return (
                                <p key={dateKey} className="text-slate-655 dark:text-slate-400">
                                  Dia {d}/{m}: <span className="line-through text-red-500">{originalHours}h</span> &rarr; <span className="font-extrabold text-blue-650">{dates[dateKey]}h</span>
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Descrição da Divergência
                </label>
                <Textarea
                  placeholder="Ex: No dia 15/06 o funcionário João saiu às 16:00 e não às 18:00..."
                  className="min-h-[100px] text-base resize-y"
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Documento de Comprovação (Opcional)
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    id="dispute-file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setDisputeFile(file);
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full flex items-center justify-center gap-2 border-dashed border-slate-350 dark:border-slate-700 py-6"
                    onClick={() => document.getElementById('dispute-file')?.click()}
                  >
                    <Paperclip className="w-4 h-4 text-slate-500" />
                    {disputeFile ? (
                      <span className="text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                        {disputeFile.name}
                      </span>
                    ) : (
                      <span className="text-slate-500">Selecionar arquivo (PDF, Imagem, Relógio Ponto)</span>
                    )}
                  </Button>
                  {disputeFile && (
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      className="text-red-500 hover:text-red-750"
                      onClick={() => setDisputeFile(null)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Envie um PDF ou imagem de seu relógio ponto ou controle interno para agilizar a verificação.
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsDisputeModalOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDispute} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                Enviar Contestação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
      </div>
    </div>
  );
}
