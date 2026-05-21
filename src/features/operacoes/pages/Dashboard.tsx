import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { fetchDashboardData } from '../services/queries';
import { KpiCard } from '../components/KpiCard';
import { HeatbarTable } from '../components/HeatbarTable';
import { FilterBar } from '../components/FilterBar';
import { useLanguage } from '../i18n';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import type { ChartData, RankItem, KpiData, Filters, ProfileMix } from '../services/types';

import { useTheme } from '@/app/providers';
import { useOutletContext } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { filters, setFilters } = useOutletContext<{ filters: Filters; setFilters: (f: Filters) => void }>();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    monthlyData: ChartData[];
    kpis: KpiData[];
    rankEmpresa: RankItem[];
    rankComercial: RankItem[];
    rankCliente: RankItem[];
    profileMix: ProfileMix[];
  }>({ monthlyData: [], kpis: [], rankEmpresa: [], rankComercial: [], rankCliente: [], profileMix: [] });

  useEffect(() => {
    setLoading(true);
    fetchDashboardData(filters).then(res => {
      // Translate dynamic KPI labels if they match keys, or just map them
      // Note: In a real app, backend might return codes. Here we map known labels.
      const translatedKpis = res.kpis.map(k => ({
        ...k,
        label: mapKpiLabel(k.label, t)
      }));

      setData({ ...res, kpis: translatedKpis });
      setLoading(false);
    });
  }, [filters, t]); // Re-run if language changes

  // Helper to translate KPI labels from mock
  const mapKpiLabel = (label: string, t: any) => {
    switch (label) {
      case 'Pedidos': return t('dashboard.kpi.pedidos');
      case 'Estimaciones': return t('dashboard.kpi.estimaciones');
      case 'Firmados': return t('dashboard.kpi.firmados');
      case 'Conv. Pedido': return t('dashboard.kpi.conv_pedido');
      case 'Fill Rate': return t('dashboard.kpi.fill_rate');
      default: return label;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 rounded-lg"></div>
        <div className="p-10 flex justify-center text-slate-500">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{t('dashboard.title')}</h2>
        <span className="text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
          {t('dashboard.subtitle')}
        </span>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {data.kpis.map((kpi, idx) => (
          <KpiCard key={idx} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Section */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.charts.performance')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#f1f5f9"} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? '#1e293b' : '#f8fafc', opacity: 0.8 }}
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderRadius: '8px',
                      border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: isDark ? '#f1f5f9' : '#0f172a'
                    }}
                    labelStyle={{ color: isDark ? '#e2e8f0' : '#0f172a', fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#64748b' }}
                  />
                  <Bar dataKey="pedidos" name={t('dashboard.kpi.pedidos')} stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={24} />
                  <Bar dataKey="estimaciones" name={t('dashboard.kpi.estimaciones')} stackId="a" fill="#cbd5e1" barSize={24} />
                  <Bar dataKey="reemplazos" name="Reemplazos" stackId="a" fill="#f43f5e" barSize={24} />
                  <Bar dataKey="reubicaciones" name="Reubicaciones" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profile Mix Section */}
        <Card className="flex flex-col border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="py-4 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">{t('dashboard.charts.profile_mix')}</CardTitle>
          </CardHeader>
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="px-5 py-3 border-b border-slate-200 dark:border-slate-700">{t('dashboard.table.profile')}</th>
                  <th className="px-5 py-3 text-right border-b border-slate-200 dark:border-slate-700">{t('dashboard.table.demand')}</th>
                  <th className="px-5 py-3 text-right border-b border-slate-200 dark:border-slate-700">{t('dashboard.table.supply')}</th>
                  <th className="px-5 py-3 text-right border-b border-slate-200 dark:border-slate-700">{t('dashboard.table.gap')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.profileMix.map((item) => (
                  <tr key={item.funcion_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]" title={item.funcion_nome}>
                      {item.funcion_nome}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500 dark:text-slate-400 font-medium">{item.pedido}</td>
                    <td className="px-5 py-3.5 text-right text-slate-700 dark:text-slate-300 font-bold">{item.real}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`inline-flex items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded text-xs font-bold ${item.gap < 0
                        ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800'
                        : item.gap > 0
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700'
                        }`}>
                        {item.gap > 0 ? '+' : ''}{item.gap}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.profileMix.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-400 text-sm">Nenhum dado disponível.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        <HeatbarTable title={t('dashboard.charts.top_companies')} items={data.rankEmpresa} />
        <HeatbarTable title={t('dashboard.charts.top_sales')} items={data.rankComercial} linkPrefix="/comerciais" />
        <HeatbarTable title={t('dashboard.charts.top_clients')} items={data.rankCliente} linkPrefix="/clientes" />
      </div>
    </div>
  );
};
