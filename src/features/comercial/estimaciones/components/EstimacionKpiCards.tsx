import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Send, CheckCircle2, AlertCircle, PenTool, Clock } from 'lucide-react';
import type { Estimacion } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  estimaciones: Estimacion[];
  selectedStatus?: string;
  onStatusSelect?: (status: string) => void;
}

function isProposalExpired(est: Estimacion): boolean {
  if (!['draft', 'review', 'sent'].includes(est.status)) return false;
  const rawValidity = est.validity_date || (est as any).current_version?.valid_until;
  let validityDate: Date;
  if (rawValidity) {
    validityDate = new Date(`${String(rawValidity).slice(0, 10)}T23:59:59`);
  } else if (est.created_at) {
    validityDate = new Date(est.created_at);
    validityDate.setDate(validityDate.getDate() + 15);
    validityDate.setHours(23, 59, 59, 999);
  } else {
    return false;
  }
  return validityDate.getTime() < Date.now();
}

export function EstimacionKpiCards({ estimaciones, selectedStatus, onStatusSelect }: Props) {
  const { t, i18n } = useTranslation();
  const openActiveCount = estimaciones.filter(e => ['draft', 'review', 'sent'].includes(e.status)).length;
  const expiredOpenCount = estimaciones.filter(e => isProposalExpired(e)).length;

  const stats = {
    total: estimaciones.length,
    draft: estimaciones.filter(e => e.status === 'draft').length,
    sent: estimaciones.filter(e => e.status === 'sent').length,
    signed: estimaciones.filter(e => e.status === 'signed').length,
    approved: estimaciones.filter(e => e.status === 'approved').length,
    rejectedOrExpired: estimaciones.filter(e => ['rejected', 'expired'].includes(e.status)).length,
    totalValue: estimaciones
      .filter(e => ['approved', 'sent', 'signed'].includes(e.status))
      .reduce((acc, curr) => acc + (curr.current_version?.total_revenue || 0), 0)
  };

  const formatCurrency = (value: number) => {
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(value);
  };

  const getCardStyle = (status: string) => {
    const base = "cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md";
    const selected = selectedStatus === status
      ? "border-indigo-650 dark:border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/10 dark:bg-indigo-950/10"
      : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-900";
    return `${base} ${selected}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
      <Card 
        onClick={() => onStatusSelect?.('all')} 
        className={getCardStyle('all')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('comercial.kpis.totalOpen')}</CardTitle>
          <FileText className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {openActiveCount} em aberto no funil
          </p>
        </CardContent>
      </Card>

      <Card 
        onClick={() => onStatusSelect?.('draft')} 
        className={getCardStyle('draft')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('comercial.kpis.drafts')}</CardTitle>
          <FileText className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.draft}</div>
        </CardContent>
      </Card>

      <Card 
        onClick={() => onStatusSelect?.('sent')} 
        className={getCardStyle('sent')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('comercial.kpis.awaitingSignature')}</CardTitle>
          <Send className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.sent}</div>
          {expiredOpenCount > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusSelect?.('expired_validity');
              }}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/50 hover:bg-red-100 transition-colors"
              title="Filtrar propostas abertas com validade vencida"
            >
              <Clock className="h-2.5 w-2.5" />
              {expiredOpenCount} vencida(s)
            </button>
          )}
        </CardContent>
      </Card>

      <Card 
        onClick={() => onStatusSelect?.('signed')} 
        className={getCardStyle('signed')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('comercial.kpis.contractsSigned')}</CardTitle>
          <PenTool className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.signed}</div>
        </CardContent>
      </Card>

      <Card 
        onClick={() => onStatusSelect?.('approved')} 
        className={getCardStyle('approved')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('comercial.kpis.approved')}</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.approved}</div>
        </CardContent>
      </Card>

      <Card 
        onClick={() => onStatusSelect?.('rejected')} 
        className={getCardStyle('rejected')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('comercial.kpis.rejectedExpired')}</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.rejectedOrExpired}</div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">{t('comercial.kpis.pipelineValue')}</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
