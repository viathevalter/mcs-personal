import { useState } from 'react';
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
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  estimaciones: Estimacion[];
  isLoading: boolean;
}

export function EstimacionesTable({ estimaciones, isLoading }: Props) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [sortField, setSortField] = useState<'codigo' | 'createdAt' | 'client' | 'type' | 'status' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'codigo' | 'createdAt' | 'client' | 'type' | 'status') => {
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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat(i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch (e) {
      return dateStr;
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

  const renderSortIcon = (field: 'codigo' | 'createdAt' | 'client' | 'type' | 'status') => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary shrink-0" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary shrink-0" />;
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">{t('comercial.table.loading')}</div>;
  }

  if (estimaciones.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">{t('comercial.table.empty')}</div>;
  }

  const sortedEstimaciones = getSortedEstimaciones();

  return (
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
            <TableHead className="font-semibold">{t('comercial.table.vendedor')}</TableHead>
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEstimaciones.map((est) => (
            <TableRow 
              key={est.id}
              className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
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
                            {est.validity_date || est.current_version?.valid_until ? formatDate(est.validity_date || est.current_version?.valid_until) : '-'}
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
              <TableCell className="text-slate-650 dark:text-slate-350">
                {est.created_by_user?.display_name || est.created_by_user?.email || '-'}
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
