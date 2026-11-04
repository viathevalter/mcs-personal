import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Estimacion } from '../types';
import { EstimacionStatusBadge } from './EstimacionStatusBadge';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Clock,
  AlertTriangle,
  XCircle,
  RotateCcw,
  UserCheck,
  Pencil,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEstimacionMutations } from '../hooks/useEstimacionMutations';
import { supabase } from '@/shared/supabase/client';

interface Props {
  estimaciones: Estimacion[];
  isLoading: boolean;
}

type SortField = 'codigo' | 'createdAt' | 'client' | 'seller' | 'validity' | 'type' | 'status';

function getEffectiveValidityDate(est: any): Date | null {
  const rawValidity = est.validity_date || est.current_version?.valid_until;
  if (rawValidity) {
    const d = new Date(`${String(rawValidity).slice(0, 10)}T23:59:59`);
    if (!isNaN(d.getTime())) return d;
  }
  if (est.created_at) {
    const d = new Date(est.created_at);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 15);
      d.setHours(23, 59, 59, 999);
      return d;
    }
  }
  return null;
}

function getValidityMeta(est: any) {
  const validityDate = getEffectiveValidityDate(est);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let daysRemaining: number | null = null;
  if (validityDate) {
    const valStart = new Date(
      validityDate.getFullYear(),
      validityDate.getMonth(),
      validityDate.getDate()
    ).getTime();
    daysRemaining = Math.round((valStart - todayStart) / (1000 * 60 * 60 * 24));
  }

  let ageDays = 0;
  if (est.created_at) {
    const created = new Date(est.created_at);
    const createdStart = new Date(created.getFullYear(), created.getMonth(), created.getDate()).getTime();
    ageDays = Math.max(0, Math.round((todayStart - createdStart) / (1000 * 60 * 60 * 24)));
  }

  return {
    validityDate,
    daysRemaining,
    ageDays,
    isOpen: ['draft', 'review', 'sent'].includes(est.status),
  };
}

export function EstimacionesTable({ estimaciones, isLoading }: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { encerrarEstimacion, atribuirVendedorEstimacion } = useEstimacionMutations();

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Close / Expire Modal State
  const [closingEstimacion, setClosingEstimacion] = useState<Estimacion | null>(null);
  const [closeStatus, setCloseStatus] = useState<'expired' | 'rejected'>('expired');
  const [closeReason, setCloseReason] = useState('');

  // Assign Seller Modal State
  const [assigningEstimacion, setAssigningEstimacion] = useState<Estimacion | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [sellersList, setSellersList] = useState<any[]>([]);

  useEffect(() => {
    if (!assigningEstimacion || sellersList.length > 0) return;
    supabase
      .schema('core_operacoes')
      .from('mcs_users')
      .select('id, email, display_name')
      .order('display_name', { ascending: true })
      .then(({ data }) => {
        if (data) {
          const sorted = [...data].sort((a, b) => {
            const aIsG = a.email?.includes('@gestaologinpro.com') ? 1 : 0;
            const bIsG = b.email?.includes('@gestaologinpro.com') ? 1 : 0;
            if (aIsG !== bIsG) return bIsG - aIsG;
            return (a.display_name || a.email || '').localeCompare(b.display_name || b.email || '');
          });
          setSellersList(sorted);
        }
      });
  }, [assigningEstimacion, sellersList.length]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedEstimaciones = () => {
    if (!sortField) return estimaciones;

    return [...estimaciones].sort((a, b) => {
      if (sortField === 'validity') {
        const va = getEffectiveValidityDate(a)?.getTime() || 0;
        const vb = getEffectiveValidityDate(b)?.getTime() || 0;
        return sortOrder === 'asc' ? va - vb : vb - va;
      }

      let valA: string = '';
      let valB: string = '';

      if (sortField === 'codigo') {
        valA = a.codigo || '';
        valB = b.codigo || '';
      } else if (sortField === 'createdAt') {
        valA = a.created_at || '';
        valB = b.created_at || '';
      } else if (sortField === 'client') {
        const clientA = a.client ? (a.client.trade_name || a.client.legal_name) : a.lead ? a.lead.company_name : '';
        const clientB = b.client ? (b.client.trade_name || b.client.legal_name) : b.lead ? b.lead.company_name : '';
        valA = clientA || '';
        valB = clientB || '';
      } else if (sortField === 'seller') {
        const sa = a.seller || a.created_by_user;
        const sb = b.seller || b.created_by_user;
        valA = sa?.display_name || sa?.email || '';
        valB = sb?.display_name || sb?.email || '';
      } else if (sortField === 'type') {
        valA = a.estimation_type || '';
        valB = b.estimation_type || '';
      } else if (sortField === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      }

      return sortOrder === 'asc'
        ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
        : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const getSolicitudTypeLabel = (type: string) => {
    return t(`comercial.requestTypes.${type}`, type);
  };

  const formatCurrency = (value: number) => {
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
  };

  const formatDate = (dateStr: string | Date) => {
    try {
      const date = typeof dateStr === 'string'
        ? (dateStr.length === 10 ? new Date(`${dateStr}T12:00:00`) : new Date(dateStr))
        : dateStr;
      return new Intl.DateTimeFormat(i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return String(dateStr);
    }
  };

  const getDurationText = (startStr?: string, endStr?: string) => {
    if (!startStr || !endStr) return '';
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return '';
      
      const isPt = i18n.resolvedLanguage === 'pt';
      const isEs = i18n.resolvedLanguage === 'es';
      
      if (diffDays >= 30) {
        const months = Math.round(diffDays / 30.4);
        if (isPt) {
          return `${months} ${months === 1 ? 'mês' : 'meses'} (${diffDays} dias)`;
        } else if (isEs) {
          return `${months} ${months === 1 ? 'mes' : 'meses'} (${diffDays} días)`;
        } else {
          return `${months} ${months === 1 ? 'month' : 'months'} (${diffDays} days)`;
        }
      }
      
      if (isPt) {
        return `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
      } else if (isEs) {
        return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
      } else {
        return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
      }
    } catch (e) {
      return '';
    }
  };

  const getPeriodText = (startStr?: string, endStr?: string) => {
    if (!startStr) return '-';
    const startFormatted = formatDate(startStr);
    if (!endStr) return startFormatted;
    
    const endFormatted = formatDate(endStr);
    const lang = i18n.resolvedLanguage || 'pt';
    const separator = lang === 'pt' ? ' a ' : lang === 'es' ? ' al ' : ' to ';
    
    return `${startFormatted}${separator}${endFormatted}`;
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary shrink-0" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary shrink-0" />;
  };

  const handleConfirmClose = () => {
    if (!closingEstimacion) return;
    encerrarEstimacion.mutate(
      {
        id: closingEstimacion.id,
        status: closeStatus,
        reason: closeReason.trim() || undefined,
      },
      {
        onSuccess: () => {
          setClosingEstimacion(null);
          setCloseReason('');
        },
      }
    );
  };

  const handleConfirmAssignSeller = () => {
    if (!assigningEstimacion || !selectedSellerId) return;
    atribuirVendedorEstimacion.mutate(
      {
        id: assigningEstimacion.id,
        commercialOwnerId: selectedSellerId,
      },
      {
        onSuccess: () => {
          setAssigningEstimacion(null);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t('comercial.table.loading')}</div>;
  }

  if (estimaciones.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">{t('comercial.table.empty')}</div>;
  }

  const sortedEstimaciones = getSortedEstimaciones();

  return (
    <>
      <div 
        className="rounded-md border bg-card overflow-y-auto max-h-[calc(100vh-320px)] overscroll-contain" 
        style={{ overscrollBehaviorY: 'contain' }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10">
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:text-foreground font-semibold select-none"
                onClick={() => handleSort('codigo')}
              >
                <div className="flex items-center">
                  {t('comercial.table.code')}
                  {renderSortIcon('codigo')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground font-semibold select-none"
                onClick={() => handleSort('createdAt')}
              >
                <div className="flex items-center">
                  {t('comercial.table.createdAt')}
                  {renderSortIcon('createdAt')}
                </div>
              </TableHead>
              <TableHead className="font-semibold">{t('comercial.table.empresa')}</TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground font-semibold select-none"
                onClick={() => handleSort('client')}
              >
                <div className="flex items-center">
                  {t('comercial.table.clientSite')}
                  {renderSortIcon('client')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground font-semibold select-none"
                onClick={() => handleSort('seller')}
              >
                <div className="flex items-center">
                  {t('comercial.table.vendedor')}
                  {renderSortIcon('seller')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground font-semibold select-none"
                onClick={() => handleSort('validity')}
              >
                <div className="flex items-center">
                  Validade / Follow-up
                  {renderSortIcon('validity')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground font-semibold select-none"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center">
                  {t('comercial.table.type')}
                  {renderSortIcon('type')}
                </div>
              </TableHead>
              <TableHead className="font-semibold">{t('comercial.table.country')}</TableHead>
              <TableHead 
                className="cursor-pointer hover:text-foreground font-semibold select-none"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  {t('comercial.table.status')}
                  {renderSortIcon('status')}
                </div>
              </TableHead>
              <TableHead className="font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEstimaciones.map((est) => {
              const validityMeta = getValidityMeta(est);

              return (
                <TableRow 
                  key={est.id}
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                  onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                >
                  <TableCell className="font-semibold text-primary">
                    {est.codigo}
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">
                      {t('comercial.table.version', { version: est.current_version?.version_number || 1 })}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-650 dark:text-slate-350">
                    {est.created_at ? formatDate(est.created_at) : '-'}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                    {est.empresa?.trade_name || est.empresa?.legal_name || '-'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <TooltipProvider>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <div 
                            className="hover:text-primary transition-colors cursor-help inline-block text-left w-full"
                            onClick={() => navigate(`/comercial/estimaciones/${est.id}`)}
                          >
                            <div className="font-medium text-slate-900 dark:text-slate-200">
                              {est.client ? (est.client.trade_name || est.client.legal_name) : est.lead ? `${est.lead.company_name} (Lead)` : t('comercial.table.noClient')}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {est.client_site?.name || (est.lead?.name ? `${t('signing.labelContact')}: ${est.lead.name}` : t('comercial.table.noSite'))}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent 
                          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-4 shadow-xl w-[320px] rounded-xl text-xs space-y-3 z-50 pointer-events-none"
                        >
                          <div className="border-b pb-2 border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="font-bold text-slate-900 dark:text-white">{est.codigo}</span>
                              <span className="text-muted-foreground font-medium">V{est.current_version?.version_number || 1}</span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-650 dark:text-slate-350 truncate">
                              {est.client ? (est.client.trade_name || est.client.legal_name) : est.lead ? est.lead.company_name : '-'}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                            <div>
                              <span className="text-muted-foreground block mb-0.5">{t('comercial.table.estimatedValue')}</span>
                              <span className="font-bold text-slate-900 dark:text-white text-sm">
                                {formatCurrency(est.current_version?.total_revenue || est.current_version?.total_estimated_revenue || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block mb-0.5">{t('comercial.table.margin')}</span>
                              <span className={`font-bold text-sm ${
                                (est.current_version?.margin_percent || est.current_version?.estimated_margin_percent || 0) >= 20 ? 'text-emerald-600' :
                                (est.current_version?.margin_percent || est.current_version?.estimated_margin_percent || 0) >= 10 ? 'text-amber-600' :
                                'text-red-650'
                              }`}>
                                {est.current_version?.margin_percent || est.current_version?.estimated_margin_percent || 0}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block mb-0.5">{t('comercial.table.validity')}</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {validityMeta.validityDate ? formatDate(validityMeta.validityDate) : '-'}
                              </span>
                            </div>
                            <div className="col-span-2 border-t pt-2 border-slate-100 dark:border-slate-800/60">
                              <span className="text-muted-foreground block mb-0.5">{t('common.period')}</span>
                              <span className="font-semibold text-slate-850 dark:text-slate-150 block text-xs">
                                {getPeriodText(est.expected_start_date, est.expected_end_date)}
                              </span>
                              {est.expected_start_date && est.expected_end_date && (
                                <span className="text-muted-foreground font-normal text-[10px] block mt-0.5">
                                  {getDurationText(est.expected_start_date, est.expected_end_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="border-t pt-2 border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white block mb-1.5">{t('comercial.table.itemsSummary')}</span>
                            <div className="max-h-[120px] overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                              {est.current_version?.items && est.current_version.items.length > 0 ? (
                                est.current_version.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-700 dark:text-slate-350">
                                    <span className="truncate max-w-[200px]">{item.job_function?.name || item.job_function?.title || 'Item'}</span>
                                    <span className="font-semibold shrink-0">{item.quantity}x</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell
                    className="text-slate-700 dark:text-slate-300 font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(() => {
                      const s = est.seller || est.created_by_user;
                      const creator = est.created_by_user;
                      const showCreatorDiff = creator && s && creator.id !== s.id;
                      const name = s ? (s.display_name || s.email?.split('@')[0] || '-') : 'Não atribuído';
                      const initials = name !== 'Não atribuído'
                        ? name
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p: string) => p[0]?.toUpperCase())
                            .join('')
                        : '?';

                      return (
                        <div className="flex items-center justify-between gap-1.5 group/seller">
                          <div className="flex items-center gap-2 min-w-0" title={s?.email || undefined}>
                            <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate max-w-[145px] text-slate-900 dark:text-slate-100">
                                {name}
                              </div>
                              {showCreatorDiff && (
                                <div className="text-[10px] text-muted-foreground truncate max-w-[145px]" title={`Criado por ${creator.display_name || creator.email}`}>
                                  Criado: {creator.display_name || creator.email?.split('@')[0]}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAssigningEstimacion(est);
                              setSelectedSellerId(s?.id || '');
                            }}
                            className="opacity-0 group-hover/seller:opacity-100 focus:opacity-100 p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-opacity shrink-0"
                            title="Alterar comercial responsável"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const { validityDate, daysRemaining, ageDays, isOpen } = validityMeta;
                      if (!validityDate) {
                        return <span className="text-xs text-muted-foreground">-</span>;
                      }

                      if (!isOpen) {
                        return (
                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {formatDate(validityDate)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {['signed', 'approved'].includes(est.status) ? 'Ciclo concluído' : 'Encerrada'}
                            </div>
                          </div>
                        );
                      }

                      const isExpired = daysRemaining !== null && daysRemaining < 0;
                      const isUrgent = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3;

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {formatDate(validityDate)}
                            </span>
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/30">
                                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                                Vencida há {Math.abs(daysRemaining!)}d
                              </span>
                            ) : isUrgent ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                {daysRemaining === 0 ? 'Vence hoje' : `Vence em ${daysRemaining}d`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                Faltam {daysRemaining}d
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {est.status === 'sent'
                              ? (ageDays === 0 ? 'Enviada hoje · aguardando firma' : `Há ${ageDays}d aguardando firma`)
                              : (ageDays === 0 ? 'Criada hoje' : `Aberta há ${ageDays}d`)}
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{getSolicitudTypeLabel(est.estimation_type)}</span>
                  </TableCell>
                  <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                    {est.country?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <EstimacionStatusBadge status={est.status} />
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {['draft', 'review', 'sent'].includes(est.status) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setClosingEstimacion(est);
                          setCloseStatus(validityMeta.daysRemaining !== null && validityMeta.daysRemaining < 0 ? 'expired' : 'rejected');
                          setCloseReason('');
                        }}
                        className="h-7 px-2.5 text-xs font-semibold border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 gap-1"
                        title="Encerrar este orçamento (Vencido ou Declinado)"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Encerrar
                      </Button>
                    ) : ['expired', 'rejected'].includes(est.status) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          encerrarEstimacion.mutate({
                            id: est.id,
                            status: 'draft',
                            reason: 'Reaberto pela galeria de orçamentos',
                          })
                        }
                        disabled={encerrarEstimacion.isPending}
                        className="h-7 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-foreground gap-1"
                        title="Reabrir orçamento como rascunho"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reabrir
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Encerrar Orçamento */}
      <Dialog open={!!closingEstimacion} onOpenChange={(open) => !open && setClosingEstimacion(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              Encerrar Orçamento {closingEstimacion?.codigo}
            </DialogTitle>
            <DialogDescription>
              Ao encerrar esta proposta, qualquer link de assinatura pendente será expirado e ela sairá da fila de propostas em aberto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold text-foreground">
                  {closingEstimacion?.client
                    ? (closingEstimacion.client.trade_name || closingEstimacion.client.legal_name)
                    : closingEstimacion?.lead?.company_name || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comercial:</span>
                <span className="font-semibold text-foreground">
                  {closingEstimacion?.seller?.display_name ||
                    closingEstimacion?.created_by_user?.display_name ||
                    closingEstimacion?.seller?.email ||
                    '-'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Motivo do Encerramento</Label>
              <Select
                value={closeStatus}
                onValueChange={(val: 'expired' | 'rejected') => setCloseStatus(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expired">Validade Expirada / Sem Retorno do Cliente</SelectItem>
                  <SelectItem value="rejected">Proposta Declinada / Cancelada pelo Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="close-reason">Observações (opcional)</Label>
              <Textarea
                id="close-reason"
                placeholder="Ex: Cliente não retornou após o prazo de validade da proposta..."
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClosingEstimacion(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmClose}
              disabled={encerrarEstimacion.isPending}
            >
              {encerrarEstimacion.isPending ? 'Encerrando...' : 'Confirmar Encerramento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Atribuir Comercial Responsável */}
      <Dialog open={!!assigningEstimacion} onOpenChange={(open) => !open && setAssigningEstimacion(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Comercial Responsável · {assigningEstimacion?.codigo}
            </DialogTitle>
            <DialogDescription>
              Defina qual comercial é o responsável pelo acompanhamento e fechamento deste orçamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Selecione o Comercial / Vendedor</Label>
              <Select value={selectedSellerId} onValueChange={setSelectedSellerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um comercial..." />
                </SelectTrigger>
                <SelectContent>
                  {sellersList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.display_name || u.email?.split('@')[0]} {u.email ? `(${u.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAssigningEstimacion(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAssignSeller}
              disabled={!selectedSellerId || atribuirVendedorEstimacion.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {atribuirVendedorEstimacion.isPending ? 'Salvando...' : 'Salvar Comercial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
