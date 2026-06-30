import React, { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchEstimaciones, fetchContratadosPorEstimacion } from '../services/queries';
import type { Estimacion } from '../services/types';
import { 
  Download, 
  Filter as FilterIcon, 
  X, 
  User, 
  Building, 
  Calendar, 
  Users, 
  FileCode,
  Percent,
  TrendingUp,
  Coins,
  Award
} from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { supabase } from '../services/supabaseClient';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useTheme } from '@/app/providers';

export const Estimaciones: React.FC = () => {
  const { filters, setFilters } = useOutletContext<{ filters: any; setFilters: any }>();
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [data, setData] = useState<Estimacion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para as opções de filtros dinâmicos
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [availableSellers, setAvailableSellers] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  // Estado para os contratados reais vinculados ao filtro
  const [contratadosData, setContratadosData] = useState<any[]>([]);
  const [loadingContratados, setLoadingContratados] = useState(false);
  
  // Estado para visualização de detalhes
  const [detailEstimate, setDetailEstimate] = useState<Estimacion | null>(null);

  // Carrega clientes, vendedores e países ao montar
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [clientsRes, leadsRes, usersRes, countriesRes] = await Promise.all([
          supabase.schema('core_common').from('clients').select('legal_name, trade_name'),
          supabase.schema('core_comercial').from('leads').select('name, company_name'),
          supabase.schema('core_operacoes').from('mcs_users').select('display_name, email'),
          supabase.schema('core_common').from('countries').select('name')
        ]);

        const clientNames = new Set<string>();
        clientsRes.data?.forEach((c: any) => {
          const name = c.trade_name || c.legal_name;
          if (name) clientNames.add(name);
        });
        leadsRes.data?.forEach((l: any) => {
          const name = l.company_name || l.name;
          if (name) clientNames.add(name);
        });

        const sellerNames = new Set<string>();
        usersRes.data?.forEach((u: any) => {
          const name = u.display_name || u.email;
          if (name) sellerNames.add(name);
        });

        const countryNames = new Set<string>();
        countriesRes.data?.forEach((c: any) => {
          if (c.name) countryNames.add(c.name);
        });

        setAvailableClients(Array.from(clientNames).sort());
        setAvailableSellers(Array.from(sellerNames).sort());
        setAvailableCountries(Array.from(countryNames).sort());
      } catch (err) {
        console.error("Erro ao carregar opções dos filtros:", err);
      }
    };
    loadFilterOptions();
  }, []);

  // Carrega dados da listagem conforme filtros mudam
  useEffect(() => {
    setLoading(true);
    fetchEstimaciones(filters)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar estimativas:", err);
        setLoading(false);
      });
  }, [filters]);

  // Carrega contratados vinculados às estimativas listadas
  useEffect(() => {
    if (data.length === 0) {
      setContratadosData([]);
      return;
    }
    setLoadingContratados(true);
    const ids = data.map(d => d.id);
    fetchContratadosPorEstimacion(ids)
      .then((res) => {
        setContratadosData(res);
        setLoadingContratados(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar contratados das estimativas:", err);
        setLoadingContratados(false);
      });
  }, [data]);

  // Agrega dados de perfis para o gráfico (Top 10)
  const chartProfilesData = useMemo(() => {
    const profileAggregation: Record<string, { name: string; orcado: number; assinado: number; contratado: number }> = {};

    // 1. Agregar quantidades orçadas e assinadas a partir das estimativas
    data.forEach(est => {
      const isSignedOrApproved = ['signed', 'approved'].includes(est.status);
      
      est.items?.forEach(item => {
        const nameNormal = item.name ? item.name.trim() : 'Outro';
        const nameKey = nameNormal.toLowerCase();

        if (!profileAggregation[nameKey]) {
          profileAggregation[nameKey] = {
            name: nameNormal,
            orcado: 0,
            assinado: 0,
            contratado: 0
          };
        }

        profileAggregation[nameKey].orcado += (item.quantity || 0);
        if (isSignedOrApproved) {
          profileAggregation[nameKey].assinado += (item.quantity || 0);
        }
      });
    });

    // 2. Agregar contratados reais
    contratadosData.forEach(c => {
      const nameNormal = c.functionName ? c.functionName.trim() : 'Outro';
      const nameKey = nameNormal.toLowerCase();

      if (profileAggregation[nameKey]) {
        profileAggregation[nameKey].contratado += 1;
      } else {
        profileAggregation[nameKey] = {
          name: nameNormal,
          orcado: 0,
          assinado: 0,
          contratado: 1
        };
      }
    });

    // 3. Ordenar por orçado decrescente e pegar as 5 principais
    return Object.values(profileAggregation)
      .sort((a, b) => b.orcado - a.orcado)
      .slice(0, 5);
  }, [data, contratadosData]);

  const stages = ['Enviado', 'Negociación', 'Firmado', 'Convertido', 'Perdido'];

  // Formatadores locais
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const getPeriodText = (start?: string, end?: string) => {
    if (!start || !end) return '-';
    return `${formatDate(start)} a ${formatDate(end)}`;
  };

  const getDurationText = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const diffTime = Math.abs(new Date(end).getTime() - new Date(start).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30);
    return `${months} meses (${diffDays} dias)`;
  };

  // KPIs reativos
  const funnelStats = stages.map(stage => {
    const stageItems = data.filter(d => d.Etapa === stage);
    const count = stageItems.length;
    const totalValue = stageItems.reduce((acc, curr) => acc + (curr.Valor || 0), 0);
    return {
      stage,
      count,
      totalValue
    };
  });

  // KPIs Analíticos Adicionais
  const totalEstimates = data.length;
  
  // Taxa de Conversão: Propostas com status 'approved' ou 'signed' sobre total geral
  const convertedOrSigned = data.filter(d => ['approved', 'signed'].includes(d.status)).length;
  const conversionRate = totalEstimates > 0 ? (convertedOrSigned / totalEstimates) * 100 : 0;

  // Pipeline em Negociação: draft, review, sent (ou seja, não finalizadas)
  const pipelineValue = data
    .filter(d => ['draft', 'review', 'sent'].includes(d.status))
    .reduce((acc, curr) => acc + (curr.Valor || 0), 0);

  // Ticket Médio: total acumulado / total de estimativas
  const totalValueAll = data.reduce((acc, curr) => acc + (curr.Valor || 0), 0);
  const averageTicket = totalEstimates > 0 ? totalValueAll / totalEstimates : 0;

  // Margem Média: Margem comercial planejada média simples das estimativas mostradas
  const averageMargin = totalEstimates > 0 
    ? data.reduce((acc, curr) => acc + (curr.margin || 0), 0) / totalEstimates 
    : 0;

  // Badge Status Mapeamento
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-750';
      case 'review':
        return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900';
      case 'sent':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
      case 'signed':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900';
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900';
      case 'rejected':
      case 'cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900';
      default:
        return 'bg-slate-55 text-slate-700 dark:bg-slate-800 dark:text-slate-350 border-slate-250 dark:border-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'review': return 'Em Revisão';
      case 'sent': return 'Aguardando Assinatura';
      case 'signed': return 'Contrato Assinado';
      case 'approved': return 'Aprovada';
      case 'rejected': return 'Rejeitada';
      case 'expired': return 'Expirada';
      case 'superseded': return 'Substituída';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;
    const headers = ['Código', 'Empresa', 'Cliente', 'Vendedor', 'Tipo', 'País', 'Status', 'Valor Estimado', 'Margem (%)', 'Data Criação'];
    const rows = data.map(d => [
      d.codigo || '',
      d.empresa || '',
      d.Cliente || '',
      d.vendedor || '',
      d.tipo || '',
      d.pais || '',
      getStatusLabel(d.status || ''),
      d.Valor || 0,
      d.margin || 0,
      d.DataCriacao || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `funil_estimativas_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        clients={availableClients} 
        sellers={availableSellers} 
        countries={availableCountries}
      />

      {/* Grid de Métricas e Gráfico Analítico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Grid 2x2 com os 4 KPIs Analíticos */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Taxa de Conversão */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div className="space-y-1 overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Conversão de Propostas</span>
              <div className="text-xl font-black text-slate-850 dark:text-white">{conversionRate.toFixed(1)}%</div>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 block truncate">Propostas aprovadas ou assinadas</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors group-hover:scale-105 duration-300 shrink-0">
              <Percent size={18} />
            </div>
          </div>

          {/* Pipeline em Negociação */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div className="space-y-1 overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Pipeline em Negociação</span>
              <div className="text-xl font-black text-slate-850 dark:text-white">{formatCurrency(pipelineValue)}</div>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 block truncate">Rascunhos, revisões e enviadas</span>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors group-hover:scale-105 duration-300 shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>

          {/* Ticket Médio */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div className="space-y-1 overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Ticket Médio</span>
              <div className="text-xl font-black text-slate-850 dark:text-white">{formatCurrency(averageTicket)}</div>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 block truncate">Média de valor por proposta</span>
            </div>
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 transition-colors group-hover:scale-105 duration-300 shrink-0">
              <Coins size={18} />
            </div>
          </div>

          {/* Margem Média */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group">
            <div className="space-y-1 overflow-hidden">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Margem Média Geral</span>
              <div className={`text-xl font-black ${
                averageMargin >= 20 ? 'text-emerald-600 dark:text-emerald-400' :
                averageMargin >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-650 dark:text-rose-455'
              }`}>{averageMargin.toFixed(1)}%</div>
              <span className="text-[10px] text-slate-450 dark:text-slate-500 block truncate">Rentabilidade média planejada</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 transition-colors group-hover:scale-105 duration-300 shrink-0">
              <Award size={18} />
            </div>
          </div>
        </div>

        {/* Lado Direito: Gráfico de Demanda por Perfil (Top 5) */}
        <Card className="lg:col-span-1 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col h-full justify-between">
          <CardHeader className="border-b border-slate-100 dark:border-slate-850 pb-2 pt-4 px-4 flex flex-row items-center justify-between shrink-0">
            <div>
              <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Perfis Profissionais (Top 5)
              </CardTitle>
              <p className="text-[9px] text-slate-400 dark:text-slate-500">
                Orçado vs Assinado vs Contratado Real
              </p>
            </div>
            {loadingContratados && (
              <span className="text-[10px] text-blue-500 font-medium animate-pulse">
                ...
              </span>
            )}
          </CardHeader>
          <CardContent className="p-3 flex-1 flex items-center justify-center">
            {chartProfilesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 italic text-[10px] h-[160px]">
                <span>Nenhum perfil cadastrado.</span>
              </div>
            ) : (
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartProfilesData}
                    layout="vertical"
                    margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="2 2" horizontal={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                    <XAxis 
                      type="number" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={85}
                      tick={{ fill: isDark ? '#cbd5e1' : '#334155', fontSize: 9, fontWeight: 'bold' }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: isDark ? 'rgba(51, 65, 85, 0.2)' : 'rgba(241, 245, 249, 0.4)' }}
                      contentStyle={{
                        backgroundColor: isDark ? '#0f172a' : '#ffffff',
                        borderColor: isDark ? '#1e293b' : '#e2e8f0',
                        borderRadius: '6px',
                        fontSize: '10px',
                        padding: '4px 6px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={20} 
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{ fontSize: '8px', fontWeight: 600 }}
                    />
                    <Bar 
                      dataKey="orcado" 
                      name="Orçado" 
                      fill="#3b82f6" 
                      radius={[0, 2, 2, 0]} 
                      barSize={6}
                    />
                    <Bar 
                      dataKey="assinado" 
                      name="Assinado" 
                      fill="#6366f1" 
                      radius={[0, 2, 2, 0]} 
                      barSize={6}
                    />
                    <Bar 
                      dataKey="contratado" 
                      name="Alocado" 
                      fill="#10b981" 
                      radius={[0, 2, 2, 0]} 
                      barSize={6}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Funil de Vendas (Quantidade e Volume)</h2>
        <button 
          onClick={handleExportCSV}
          disabled={data.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-650 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          <Download size={16} />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Funnel Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {funnelStats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-xl border-b-4 border-blue-500 dark:border-blue-600 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.stage}</div>
            <div className="mt-2 flex flex-col">
              <span className="text-2xl font-bold text-slate-850 dark:text-slate-100">{stat.count}</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate mt-1">
                {formatCurrency(stat.totalValue)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Lista de Oportunidades</h3>
          <FilterIcon size={16} className="text-slate-400 dark:text-slate-500" />
        </div>
        
        {/* Scroll Confinado Internamente na Tabela */}
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-sm relative">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(30,41,59,1)] bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Empresa</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">País</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Carregando estimativas...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    Nenhuma estimativa encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Código com Tooltip (Hover) */}
                    <td className="px-6 py-4">
                      <TooltipProvider>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setDetailEstimate(row)}
                              className="font-bold text-blue-600 dark:text-blue-400 hover:underline text-left"
                            >
                              <div>{row.codigo}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                Versão {row.versionNumber}
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-4 shadow-xl w-[320px] rounded-xl text-xs space-y-3 z-50 pointer-events-none"
                          >
                            <div className="border-b pb-2 border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="font-bold text-slate-900 dark:text-white">{row.codigo}</span>
                                <span className="text-muted-foreground font-medium">V{row.versionNumber}</span>
                              </div>
                              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                                {row.Cliente}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                              <div>
                                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Valor Estimado</span>
                                <span className="font-bold text-slate-900 dark:text-white text-sm">
                                  {formatCurrency(row.Valor || 0)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Margem</span>
                                <span className={`font-bold text-sm ${
                                  (row.margin || 0) >= 20 ? 'text-emerald-600' :
                                  (row.margin || 0) >= 10 ? 'text-amber-600' : 'text-red-650'
                                }`}>
                                  {row.margin}%
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Validade</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {formatDate(row.validityDate)}
                                </span>
                              </div>
                              <div className="col-span-2 border-t pt-2 border-slate-100 dark:border-slate-800/60">
                                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">Período</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-xs">
                                  {getPeriodText(row.startDate, row.endDate)}
                                </span>
                                {row.startDate && row.endDate && (
                                  <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px] block mt-0.5">
                                    {getDurationText(row.startDate, row.endDate)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="border-t pt-2 border-slate-100 dark:border-slate-800">
                              <span className="font-bold text-slate-900 dark:text-white block mb-1.5">Resumo de Itens</span>
                              <div className="max-h-[120px] overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
                                {row.items && row.items.length > 0 ? (
                                  row.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-slate-650 dark:text-slate-400">
                                      <span className="truncate max-w-[200px]">{item.name}</span>
                                      <span className="font-semibold shrink-0">{item.quantity}x</span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 italic">-</span>
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    
                    <td className="px-6 py-4 font-medium text-slate-800 dark:text-slate-200">{row.empresa}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-350">{row.Cliente}</td>
                    <td className="px-6 py-4 text-slate-650 dark:text-slate-400">{row.vendedor}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.tipo}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.pais}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(row.status || '')}`}>
                        {getStatusLabel(row.status || '')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- OVERLAY MODAL: DETALHES DA ESTIMATIVA --- */}
      {detailEstimate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full flex flex-col max-h-[90vh] overflow-hidden transition-colors max-w-3xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <FileCode size={20} />
                </div>
                <span>Detalhes da Estimativa: {detailEstimate.codigo}</span>
              </h3>
              <button 
                onClick={() => setDetailEstimate(null)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Empresa</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{detailEstimate.empresa}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Cliente / Oportunidade</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{detailEstimate.Cliente}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Vendedor</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{detailEstimate.vendedor}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Tipo de Pedido</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{detailEstimate.tipo}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">País</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{detailEstimate.pais}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Etapa Atual</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(detailEstimate.status || '')}`}>
                    {getStatusLabel(detailEstimate.status || '')}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Valor Estimado</span>
                  <span className="font-bold text-slate-900 dark:text-white text-lg">{formatCurrency(detailEstimate.Valor || 0)}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Margem Planejada</span>
                  <span className={`font-bold text-lg ${
                    (detailEstimate.margin || 0) >= 20 ? 'text-emerald-600' :
                    (detailEstimate.margin || 0) >= 10 ? 'text-amber-600' : 'text-red-650'
                  }`}>{detailEstimate.margin}%</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-1">Validade</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(detailEstimate.validityDate)}</span>
                </div>
              </div>

              {/* Period Area */}
              <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-2">Período de Alocação</span>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center text-sm gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    {getPeriodText(detailEstimate.startDate, detailEstimate.endDate)}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                    {getDurationText(detailEstimate.startDate, detailEstimate.endDate)}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase block">Resumo de Perfis Requeridos</span>
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950/20">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-550 dark:text-slate-400 text-[11px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Função / Perfil Profissional</th>
                        <th className="px-6 py-3 text-right">Qtd. Solicitada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detailEstimate.items && detailEstimate.items.length > 0 ? (
                        detailEstimate.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-55/50 dark:hover:bg-slate-900/30">
                            <td className="px-6 py-3.5 font-medium text-slate-700 dark:text-slate-300">{item.name}</td>
                            <td className="px-6 py-3.5 text-right font-bold text-slate-800 dark:text-slate-200">{item.quantity}x</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-6 py-4 text-center text-slate-400 italic">
                            Nenhum item cadastrado nesta estimativa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
              <button 
                onClick={() => setDetailEstimate(null)} 
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
