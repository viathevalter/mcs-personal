import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Send, CheckCircle2, AlertCircle, PenTool } from 'lucide-react';
import type { Estimacion } from '../types';

interface Props {
  estimaciones: Estimacion[];
}

export function EstimacionKpiCards({ estimaciones }: Props) {
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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total (Abertas)</CardTitle>
          <FileText className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Rascunhos</CardTitle>
          <FileText className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.draft}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Assinatura</CardTitle>
          <Send className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.sent}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Contratos Assinados</CardTitle>
          <PenTool className="h-4 w-4 text-violet-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.signed}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Aprovadas</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.approved}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Rejeitadas/Vencidas</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.rejectedOrExpired}</div>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">Valor Global (Pipeline)</CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-primary">{formatCurrency(stats.totalValue)}</div>
        </CardContent>
      </Card>
    </div>
  );
}
