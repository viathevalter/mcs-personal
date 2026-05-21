
import type { JobFunction } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, AlertTriangle, ShieldOff, DollarSign } from 'lucide-react';

interface JobFunctionsKPIsProps {
  data: JobFunction[];
}

export function JobFunctionsKPIs({ data }: JobFunctionsKPIsProps) {
  const totalActives = data.filter(j => j.status === 'active').length;
  const totalArchived = data.filter(j => j.status === 'archived').length;
  const criticalRisk = data.filter(j => j.risk_level === 'critical' && j.status === 'active').length;
  
  // Como estamos na Fase 1/2, ainda não temos o join das perguntas, EPIs e Tarifas
  // Faremos esses cálculos de forma real nas próximas Fases.
  const noEpis = 0; // TODO: Fase 5
  const noRates = 0; // TODO: Fase 6

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Funções Ativas</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalActives}</div>
          <p className="text-xs text-muted-foreground">
            {totalArchived} arquivadas / inativas
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Risco Crítico</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{criticalRisk}</div>
          <p className="text-xs text-muted-foreground">
            Funções de alta periculosidade
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sem EPIs (Alerta)</CardTitle>
          <ShieldOff className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{noEpis}</div>
          <p className="text-xs text-muted-foreground">
            Aguardando integração na Fase 5
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sem Tarifa Ref.</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{noRates}</div>
          <p className="text-xs text-muted-foreground">
            Aguardando integração na Fase 6
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
