import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Send, CheckCircle2, AlertCircle, PenTool } from 'lucide-react';
import type { Estimacion } from '../types';
import { useTranslation } from 'react-i18next';

interface Props {
  estimaciones: Estimacion[];
  selectedStatus?: string;
  onStatusSelect?: (status: string) => void;
}

export function EstimacionKpiCards({ estimaciones, selectedStatus, onStatusSelect }: Props) {
  const { t, i18n } = useTranslation();
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
