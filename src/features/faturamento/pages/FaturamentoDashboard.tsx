import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Activity, DollarSign, Users } from 'lucide-react';

export function FaturamentoDashboard() {
  return (
    <div className="p-6 space-y-6 max-w-full w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Faturamento</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral das métricas e desempenho financeiro.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Projetada</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">€ 0,00</div>
            <p className="text-xs text-muted-foreground font-medium">0% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturas em Processamento</CardTitle>
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Faturadas (Mês)</CardTitle>
            <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0h</div>
            <p className="text-xs text-muted-foreground font-medium">0% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Faturados</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</div>
            <p className="text-xs text-muted-foreground">Neste ciclo de faturamento</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Evolução do Faturamento</CardTitle>
            <CardDescription>Receita gerada nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-lg m-6 mt-0 border border-dashed border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center text-muted-foreground">
              <BarChart className="h-10 w-10 mb-2 opacity-50" />
              <p>Gráfico de faturamento será exibido aqui</p>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
            <CardDescription>Clientes com maior volume de horas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[240px] text-muted-foreground border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Nenhum cliente faturado no período</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
