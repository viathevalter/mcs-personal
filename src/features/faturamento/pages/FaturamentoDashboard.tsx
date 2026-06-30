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
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">€ 45.231,89</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+20.1% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturas em Processamento</CardTitle>
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">35</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Faturadas (Mês)</CardTitle>
            <BarChart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">1.234h</div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+19% em relação ao mês anterior</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Faturados</CardTitle>
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">12</div>
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
            <div className="space-y-4">
              {[
                { name: 'Construtora XYZ', hours: '450h', value: '€ 12.500' },
                { name: 'Engenharia ABC', hours: '320h', value: '€ 8.900' },
                { name: 'Empreiteira Silva', hours: '210h', value: '€ 5.800' },
                { name: 'Grupo Omega', hours: '150h', value: '€ 4.200' },
                { name: 'Obras & Cia', hours: '104h', value: '€ 2.900' },
              ].map((client, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.hours}</p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{client.value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
