import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../shared/supabase/client';
import { format, getDaysInMonth, startOfMonth, addDays, isWithinInterval, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Calendar, DollarSign, Building2, Bed, Home } from 'lucide-react';

interface Alojamento {
  id: string;
  nome: string;
  capacidade: number;
  custo_mensal_total: number;
}

interface Cama {
  id: string;
  alojamento_id: string;
  nome_cama: string;
}

interface Alocacao {
  id: string;
  cama_id: string;
  worker_id: string;
  project_name: string;
  data_inicio: string;
  data_fim: string;
}

export function LogisticaDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayOfMonth = startOfMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => addDays(firstDayOfMonth, i));

  const fetchLogisticsData = async () => {
    // Tenta primeiro no schema core_logistics, se falhar ou não retornar, pode estar no public
    // Usa any para não ter erro de TS se o schema não estiver tipado
    const client = (supabase as any).schema ? (supabase as any).schema('core_logistics') : supabase;
    
    let alojamentosRes = await client.from('alojamentos').select('*');
    if (alojamentosRes.error) {
      console.warn("Erro ao buscar alojamentos em core_logistics, tentando public...", alojamentosRes.error);
      alojamentosRes = await supabase.from('alojamentos').select('*');
    }
    
    const camasRes = await client.from('camas').select('*');
    const alocacoesRes = await client.from('alocacoes').select('*');

    return {
      alojamentos: (alojamentosRes.data || []) as Alojamento[],
      camas: ((camasRes.data && !camasRes.error) ? camasRes.data : ((await supabase.from('camas').select('*')).data || [])) as Cama[],
      alocacoes: ((alocacoesRes.data && !alocacoesRes.error) ? alocacoesRes.data : ((await supabase.from('alocacoes').select('*')).data || [])) as Alocacao[],
    };
  };

  const { data, isLoading } = useQuery({
    queryKey: ['logistica-data', format(currentDate, 'yyyy-MM')],
    queryFn: fetchLogisticsData,
  });

  // Cálculo de Rateio de Custos
  const costApportionment = useMemo(() => {
    if (!data) return [];
    
    const projectCosts: Record<string, number> = {};

    data.alocacoes.forEach(alocacao => {
      const cama = data.camas.find(c => c.id === alocacao.cama_id);
      if (!cama) return;
      
      const alojamento = data.alojamentos.find(a => a.id === cama.alojamento_id);
      if (!alojamento || !alojamento.custo_mensal_total || !alojamento.capacidade) return;

      const dailyCost = alojamento.custo_mensal_total / alojamento.capacidade / 30;
      
      // Contar quantos dias esta alocação ocupou no mês atual
      let daysUsedInMonth = 0;
      const start = parseISO(alocacao.data_inicio);
      const end = parseISO(alocacao.data_fim);

      daysArray.forEach(day => {
        // Zera as horas para comparar corretamente apenas a data
        const dayNormalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

        if (dayNormalized >= startNormalized && dayNormalized <= endNormalized) {
          daysUsedInMonth++;
        }
      });

      if (daysUsedInMonth > 0) {
        if (!projectCosts[alocacao.project_name]) {
          projectCosts[alocacao.project_name] = 0;
        }
        projectCosts[alocacao.project_name] += (daysUsedInMonth * dailyCost);
      }
    });

    return Object.entries(projectCosts).map(([project, cost]) => ({
      project,
      cost
    })).sort((a, b) => b.cost - a.cost);
  }, [data, daysArray]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Home className="h-8 w-8 text-blue-600" />
            Logística e Alojamentos
          </h1>
          <p className="text-slate-500 mt-1">Gestão de ocupação de camas e rateio de custos por obra.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg border shadow-sm">
          <button 
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
            onClick={() => setCurrentDate(addDays(currentDate, -30))}
          >
            &lt;
          </button>
          <div className="flex items-center gap-2 font-medium text-slate-700 min-w-[140px] justify-center">
            <Calendar className="h-4 w-4" />
            <span className="capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
          </div>
          <button 
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
            onClick={() => setCurrentDate(addDays(currentDate, 30))}
          >
            &gt;
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Timeline (Gantt) - 3 columns on XL */}
        <div className="xl:col-span-3 bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Bed className="h-5 w-5 text-indigo-500" />
              Timeline de Ocupação
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header: Days */}
              <div className="flex border-b bg-slate-50">
                <div className="w-64 shrink-0 p-3 font-semibold text-sm text-slate-600 border-r flex items-center">
                  Alojamento / Cama
                </div>
                <div className="flex flex-1">
                  {daysArray.map((day, i) => (
                    <div 
                      key={i} 
                      className="w-10 shrink-0 p-2 text-center text-xs font-medium text-slate-500 border-r border-slate-100 flex flex-col items-center justify-center"
                      title={format(day, 'dd/MM/yyyy')}
                    >
                      <span>{format(day, 'EEEEEE', { locale: ptBR })}</span>
                      <span className={`text-sm ${format(day, 'MM-dd') === format(new Date(), 'MM-dd') ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mt-1' : 'mt-1'}`}>
                        {format(day, 'dd')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows: Accommodations and Beds */}
              {data?.alojamentos.map(alojamento => {
                const camasDoAlojamento = data.camas.filter(c => c.alojamento_id === alojamento.id);
                
                return (
                  <div key={alojamento.id} className="group border-b last:border-0">
                    <div className="flex bg-slate-50/50 group-hover:bg-slate-50">
                      {/* Alojamento Name */}
                      <div className="w-64 shrink-0 p-2 pl-3 border-r font-medium text-sm text-slate-800 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {alojamento.nome}
                      </div>
                      {/* Empty row for the accommodation header */}
                      <div className="flex flex-1">
                        {daysArray.map((_, i) => (
                          <div key={i} className="w-10 shrink-0 border-r border-slate-100" />
                        ))}
                      </div>
                    </div>

                    {/* Beds */}
                    {camasDoAlojamento.map(cama => {
                      // Find allocations for this bed
                      const alocacoesDaCama = data.alocacoes.filter(a => a.cama_id === cama.id);

                      return (
                        <div key={cama.id} className="flex hover:bg-slate-50/80 transition-colors">
                          <div className="w-64 shrink-0 p-2 pl-8 border-r text-sm text-slate-600 flex items-center">
                            {cama.nome_cama}
                          </div>
                          
                          <div className="flex flex-1 relative">
                            {daysArray.map((day, i) => {
                              // Check if day is occupied
                              const dayNormalized = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                              
                              const alocacaoNoDia = alocacoesDaCama.find(aloc => {
                                const start = new Date(parseISO(aloc.data_inicio).getFullYear(), parseISO(aloc.data_inicio).getMonth(), parseISO(aloc.data_inicio).getDate());
                                const end = new Date(parseISO(aloc.data_fim).getFullYear(), parseISO(aloc.data_fim).getMonth(), parseISO(aloc.data_fim).getDate(), 23, 59, 59);
                                return dayNormalized >= start && dayNormalized <= end;
                              });

                              const isOccupied = !!alocacaoNoDia;

                              // For rendering a continuous block (optional improvement for later: render absolute positioned div over the grid)
                              // Here we render cell by cell with a colored background
                              return (
                                <div 
                                  key={i} 
                                  className={`w-10 shrink-0 border-r border-slate-100 ${isOccupied ? 'bg-indigo-100' : ''}`}
                                  title={isOccupied ? `Ocupado por ${alocacaoNoDia.worker_id} na obra ${alocacaoNoDia.project_name}` : 'Livre'}
                                >
                                  {isOccupied && (
                                    <div className="w-full h-full border-y border-indigo-300 bg-indigo-200/50"></div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              
              {(!data?.alojamentos || data.alojamentos.length === 0) && (
                <div className="p-8 text-center text-slate-500">
                  Nenhum alojamento cadastrado.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cost Apportionment Card */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 flex items-center justify-between">
              <h2 className="font-semibold text-lg flex items-center gap-2 text-emerald-800">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Rateio por Obra
              </h2>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-4">
              <p className="text-sm text-slate-500">
                Custos calculados com base nos dias de ocupação de cada obra no mês de {format(currentDate, 'MMMM', { locale: ptBR })}.
              </p>

              <div className="space-y-3 mt-2">
                {costApportionment.length > 0 ? (
                  costApportionment.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border">
                      <span className="font-medium text-slate-700 truncate mr-2" title={item.project}>
                        {item.project}
                      </span>
                      <span className="font-bold text-emerald-600 whitespace-nowrap">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(item.cost)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                    Nenhum custo a ratear neste mês.
                  </div>
                )}
              </div>
              
              {costApportionment.length > 0 && (
                <div className="mt-auto pt-4 border-t">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-slate-800">Total</span>
                    <span className="font-bold text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(
                        costApportionment.reduce((acc, curr) => acc + curr.cost, 0)
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
