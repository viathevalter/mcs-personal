import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { AllocateWorkerDialog } from './components/AllocateWorkerDialog';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Users, 
  Clock, 
  Search, 
  MapPin, 
  Calendar, 
  Award, 
  Phone, 
  Shield, 
  UserPlus, 
  Shirt, 
  CreditCard,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Loader2,
  HelpCircle
} from 'lucide-react';
import type { OpenPosition } from './hooks/useOpenPositions';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const HiringDashboardPage: React.FC = () => {
  const { selectedEmpresaId } = useEmpresa();
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [selectedPosition, setSelectedPosition] = useState<OpenPosition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getProfileQuestions = (perguntaRespuesta: any, cargoName: string) => {
    if (!perguntaRespuesta || typeof perguntaRespuesta !== 'object') return [];
    return Object.values(perguntaRespuesta).filter((q: any) => 
      q?.cargo?.toLowerCase() === cargoName?.toLowerCase()
    );
  };

  // 1. Query all active Pedidos (excluding cancelled ones) with their client details and items
  const { data: activePedidos = [], isLoading: isLoadingPedidos, refetch: refetchPedidos } = useQuery({
    queryKey: ['active_pedidos', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      
      // Fetch pedidos
      const { data: pedidos, error: pedidosErr } = await supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .neq('operational_status', 'cancelled')
        .order('created_at', { ascending: false });
        
      if (pedidosErr) throw pedidosErr;
      if (!pedidos || pedidos.length === 0) return [];

      const pedidoIds = pedidos.map(p => p.id);
      const clientIds = [...new Set(pedidos.map(p => p.client_id).filter(Boolean))];
      const siteIds = [...new Set(pedidos.map(p => p.client_site_id).filter(Boolean))];

      // Fetch items
      const { data: items, error: itemsErr } = await supabase
        .schema('core_comercial')
        .from('pedido_items')
        .select('*')
        .in('pedido_id', pedidoIds);

      if (itemsErr) throw itemsErr;

      const jobFunctionIds = [...new Set((items || []).map(i => i.job_function_id).filter(Boolean))];

      // Fetch clients, sites, and functions in parallel
      const [clientsRes, sitesRes, jobsRes] = await Promise.all([
        clientIds.length > 0 
          ? supabase.schema('core_common').from('clients').select('id, trade_name, legal_name').in('id', clientIds)
          : Promise.resolve({ data: [] }),
        siteIds.length > 0
          ? supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code').in('id', siteIds)
          : Promise.resolve({ data: [] }),
        jobFunctionIds.length > 0
          ? supabase.schema('core_comercial').from('job_functions').select('id, name').in('id', jobFunctionIds)
          : Promise.resolve({ data: [] })
      ]);

      const clientsMap = new Map(clientsRes.data?.map(c => [c.id, c]) || []);
      const sitesMap = new Map(sitesRes.data?.map(s => [s.id, s]) || []);
      const jobsMap = new Map(jobsRes.data?.map(j => [j.id, j]) || []);

      return pedidos.map(pedido => {
        const pedidoItems = (items || [])
          .filter(item => item.pedido_id === pedido.id)
          .map(item => ({
            ...item,
            job_function: jobsMap.get(item.job_function_id) || null
          }));

        return {
          ...pedido,
          client: clientsMap.get(pedido.client_id) || null,
          client_site: sitesMap.get(pedido.client_site_id) || null,
          pedido_items: pedidoItems
        };
      });
    },
    enabled: !!selectedEmpresaId
  });

  // Automatically select the first Pedido if none is selected
  React.useEffect(() => {
    if (activePedidos.length > 0 && !selectedPedidoId) {
      setSelectedPedidoId(activePedidos[0].id);
    }
  }, [activePedidos, selectedPedidoId]);

  // Selected Pedido helper
  const selectedPedido = useMemo(() => {
    return activePedidos.find(p => p.id === selectedPedidoId) || null;
  }, [activePedidos, selectedPedidoId]);

  // 2. Query all allocations for the selected Pedido
  const { data: allocations = [], isLoading: isLoadingAllocations, refetch: refetchAllocations } = useQuery({
    queryKey: ['pedido_allocations', selectedPedidoId],
    queryFn: async () => {
      if (!selectedPedidoId) return [];
      
      const { data, error } = await supabase
        .schema('core_personal')
        .from('worker_assignments')
        .select(`
          id,
          status,
          planned_start_date,
          start_date,
          tarifa_acordada,
          job_function_name_snapshot,
          worker:workers(
            id,
            nome,
            nif,
            camiseta,
            pantalones,
            licencia_conducir,
            movil,
            cod_colab
          )
        `)
        .eq('pedido_id', selectedPedidoId)
        .in('status', ['planned', 'active', 'paused']);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPedidoId
  });

  // Calculate totals across all active orders
  const totals = useMemo(() => {
    let requested = 0;
    let fulfilled = 0;
    
    activePedidos.forEach(p => {
      p.pedido_items?.forEach((item: any) => {
        requested += item.quantity_requested || 0;
        fulfilled += item.quantity_fulfilled || 0;
      });
    });

    return {
      openVacancies: requested - fulfilled,
      totalRequested: requested,
      totalFulfilled: fulfilled,
      activeOrders: activePedidos.length
    };
  }, [activePedidos]);

  // Filtered pedidos for sidebar search
  const filteredPedidos = useMemo(() => {
    if (!searchQuery) return activePedidos;
    const query = searchQuery.toLowerCase();
    return activePedidos.filter(p => {
      const clientName = (p.client?.trade_name || p.client?.legal_name || '').toLowerCase();
      const code = (p.codigo || '').toLowerCase();
      return clientName.includes(query) || code.includes(query);
    });
  }, [activePedidos, searchQuery]);

  const handleOpenAllocateDialog = (item: any) => {
    if (!selectedPedido) return;

    setSelectedPosition({
      id: item.id,
      pedido_id: selectedPedido.id,
      pedido_codigo: selectedPedido.codigo,
      client_id: selectedPedido.client_id,
      client_name: selectedPedido.client?.trade_name || selectedPedido.client?.legal_name || 'Cliente',
      client_site_id: selectedPedido.client_site_id,
      site_name: selectedPedido.client_site?.name || 'Local',
      job_function_id: item.job_function_id,
      job_function_name: item.job_function_name_snapshot || item.job_function?.name || 'Função',
      expected_start_date: selectedPedido.expected_start_date,
      quantity_requested: item.quantity_requested,
      quantity_fulfilled: item.quantity_fulfilled,
      status: item.status,
      pergunta_respuesta: selectedPedido.pergunta_respuesta,
      base_cost_hour_snapshot: item.base_cost_hour_snapshot
    });
    
    setIsDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-[1700px] mx-auto flex flex-col space-y-6 h-[calc(100vh-80px)] overflow-hidden font-sans">
      
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-850 dark:text-white flex items-center">
            <Users className="mr-2 h-7 w-7 text-indigo-600" />
            Contratação Inicial & Operações
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Aloque trabalhadores para as vagas abertas dos pedidos e verifique tamanhos de roupa, CNH e tarifas.
          </p>
        </div>

        {/* Small Stat Badges */}
        <div className="flex space-x-3 text-xs">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-2 flex items-center space-x-2">
            <Users className="h-4 w-4 text-amber-600" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Vagas em Aberto</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">{isLoadingPedidos ? '-' : totals.openVacancies}</p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-2 flex items-center space-x-2">
            <Briefcase className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Pedidos Ativos</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">{isLoadingPedidos ? '-' : totals.activeOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Sidebar: Pedidos List */}
        <div className="w-80 md:w-96 flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shrink-0 overflow-hidden shadow-sm">
          
          {/* Search Box */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar cliente ou pedido..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-xs placeholder:text-slate-450 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Pedidos List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/40">
            {isLoadingPedidos ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-2 text-slate-400">
                <Clock className="animate-spin h-6 w-6 text-indigo-500" />
                <span className="text-xs">Carregando pedidos...</span>
              </div>
            ) : filteredPedidos.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-10">Nenhum pedido ativo encontrado.</p>
            ) : (
              filteredPedidos.map(pedido => {
                const isSelected = pedido.id === selectedPedidoId;
                const clientName = pedido.client?.trade_name || pedido.client?.legal_name || 'Cliente';
                const dateStr = pedido.expected_start_date 
                  ? new Date(pedido.expected_start_date).toLocaleDateString('pt-PT') 
                  : 'N/A';
                
                // Calculate progress
                let reqQty = 0;
                let fulQty = 0;
                pedido.pedido_items?.forEach((item: any) => {
                  reqQty += item.quantity_requested || 0;
                  fulQty += item.quantity_fulfilled || 0;
                });
                
                const isFulfilled = reqQty > 0 && fulQty >= reqQty;
                const progressBadge = isFulfilled 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700';

                return (
                  <button
                    key={pedido.id}
                    onClick={() => setSelectedPedidoId(pedido.id)}
                    className={`w-full text-left p-4 flex items-center justify-between transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-4 ${
                      isSelected 
                        ? 'border-indigo-650 bg-indigo-50/10 dark:bg-indigo-950/10' 
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-indigo-650 dark:text-indigo-400">{pedido.codigo}</span>
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {dateStr}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-slate-800 dark:text-white truncate mt-1">{clientName}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {pedido.client_site?.name || 'Local não definido'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${progressBadge}`}>
                        {fulQty}/{reqQty} Contr.
                      </span>
                      <ChevronRight className={`h-4 w-4 mt-2 text-slate-300 transition-transform ${isSelected ? 'text-indigo-600 translate-x-1' : ''}`} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Selected Pedido Details */}
        <div className="flex-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-y-auto shadow-sm p-6 space-y-6">
          
          {selectedPedido ? (
            <>
              {/* Card 1: Pedido Details Header */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-3 gap-2">
                  <div>
                    <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Pedido Comercial
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {selectedPedido.client?.trade_name || selectedPedido.client?.legal_name || 'Cliente'}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-indigo-650 dark:text-indigo-400">{selectedPedido.codigo}</span>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                      Status Operacional: <strong className="text-slate-700 dark:text-slate-350">{selectedPedido.operational_status}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500">Ubicación / Obra</span>
                      <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                        {selectedPedido.client_site?.address_line ? (
                          <>
                            {selectedPedido.client_site.address_line}
                            {selectedPedido.client_site.city && `, ${selectedPedido.client_site.city}`}
                            {selectedPedido.client_site.postal_code && ` (${selectedPedido.client_site.postal_code})`}
                          </>
                        ) : 'Não definido'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Calendar className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500">Período Previsto</span>
                      <p className="font-medium text-slate-800 dark:text-slate-100 mt-0.5">
                        {selectedPedido.expected_start_date ? new Date(selectedPedido.expected_start_date).toLocaleDateString('pt-PT') : 'N/A'} 
                        {' '} até {' '}
                        {selectedPedido.expected_end_date ? new Date(selectedPedido.expected_end_date).toLocaleDateString('pt-PT') : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Briefcase className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-500">Observações Gerais</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 italic max-h-[60px] overflow-y-auto">
                        {selectedPedido.notes || 'Sem observações gerais.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Required Functions Grid (Vagas) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                    <Award className="mr-1.5 h-4.5 w-4.5 text-indigo-500" />
                    Vagas por Perfil / Função
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">Selecione para contratar</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedPedido.pedido_items?.map((item: any) => {
                    const isItemFulfilled = (item.quantity_fulfilled || 0) >= (item.quantity_requested || 0);
                    const progress = item.quantity_requested > 0 
                      ? Math.min(100, Math.round((item.quantity_fulfilled / item.quantity_requested) * 100))
                      : 0;

                    return (
                      <div 
                        key={item.id} 
                        className={`border rounded-xl p-4 flex flex-col justify-between space-y-4 hover:shadow-md transition-all ${
                          isItemFulfilled 
                            ? 'bg-emerald-50/10 border-emerald-150 dark:bg-emerald-950/5 dark:border-emerald-950' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="font-bold text-sm text-slate-850 dark:text-white truncate">
                                {item.job_function_name_snapshot || item.job_function?.name || 'Perfil'}
                              </h4>
                              {(() => {
                                const qas = getProfileQuestions(selectedPedido.pergunta_respuesta, item.job_function_name_snapshot || item.job_function?.name);
                                if (qas.length === 0) return null;
                                return (
                                  <TooltipProvider>
                                    <Tooltip delayDuration={100}>
                                      <TooltipTrigger asChild>
                                        <button type="button" className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                                          <HelpCircle className="h-3.5 w-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs bg-slate-900 border border-slate-800 text-white p-3 rounded-lg shadow-lg">
                                        <div className="space-y-2 text-xs">
                                          <p className="font-bold border-b border-slate-800 pb-1 text-slate-350">Respostas da Viabilidade:</p>
                                          {qas.map((qa: any, idx: number) => (
                                            <div key={idx} className="space-y-0.5">
                                              <span className="text-slate-400 font-medium block">{qa.pergunta}</span>
                                              <span className="text-white font-semibold block">{qa.resposta}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })()}
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isItemFulfilled 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                : 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/40 dark:text-amber-400'
                            }`}>
                              {item.quantity_fulfilled} de {item.quantity_requested} Contratados
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${isItemFulfilled ? 'bg-emerald-550' : 'bg-amber-500'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <div className="space-y-1.5 text-slate-500">
                            <p>EPI: {item.includes_epi ? 'Incluso' : 'Não incluso'}</p>
                            <p>Alojamento: {item.includes_housing ? 'Incluso' : 'Não incluso'}</p>
                            {item.base_cost_hour_snapshot && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-400">Tarifa Orçada:</span>
                                <span className="font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/45 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 text-xs shadow-sm">
                                  {Number(item.base_cost_hour_snapshot).toFixed(2)} €/h
                                </span>
                              </div>
                            )}
                          </div>

                          <Button
                            size="sm"
                            disabled={isItemFulfilled}
                            onClick={() => handleOpenAllocateDialog(item)}
                            className={`h-8 text-xs font-semibold ${
                              isItemFulfilled 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                            }`}
                          >
                            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                            + Contratar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Currently Hired Workers */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                    <CheckCircle2 className="mr-1.5 h-4.5 w-4.5 text-emerald-600" />
                    Pessoas Contratadas
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">Total: {allocations.length} alocados</span>
                </div>

                {isLoadingAllocations ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : allocations.length === 0 ? (
                  <div className="text-center py-10 border rounded-xl bg-slate-50/20 dark:bg-slate-950/10 border-dashed">
                    <p className="text-xs text-muted-foreground">Nenhum trabalhador contratado/alocado para este pedido ainda.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allocations.map((alloc: any) => {
                      const worker = alloc.worker || {};
                      
                      return (
                        <div key={alloc.id} className="border border-slate-100 dark:border-slate-800 bg-slate-50/25 dark:bg-slate-950/10 hover:bg-slate-50 dark:hover:bg-slate-950/20 rounded-xl p-4 space-y-3 hover:shadow-sm transition-all">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-sm text-slate-850 dark:text-white">{worker.nome || 'Desconhecido'}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Cód: {worker.cod_colab || 'N/A'} • NIF: {worker.nif || 'Não informado'}
                              </p>
                            </div>
                            <span className="bg-indigo-50 text-indigo-755 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900">
                              {alloc.job_function_name_snapshot || 'Perfil'}
                            </span>
                          </div>

                          {/* Specific hiring fields: sizes, driving license, rate */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
                            
                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Shirt className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">Camisa:</span>
                              <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                {worker.camiseta || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Shirt className="h-3.5 w-3.5 text-slate-400 shrink-0 transform rotate-180" />
                              <span className="font-semibold text-slate-500">Calça:</span>
                              <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                {worker.pantalones || 'N/A'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Shield className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">CNH:</span>
                              <span className={`font-bold px-1.5 py-0.2 rounded ${worker.licencia_conducir === 'Si' ? 'text-emerald-700 bg-emerald-100/50' : 'text-slate-600 bg-slate-100'}`}>
                                {worker.licencia_conducir || 'No'}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
                              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">Celular:</span>
                              <span className="font-bold text-slate-800 dark:text-white truncate">
                                {worker.movil || 'Não informado'}
                              </span>
                            </div>

                            <div className="col-span-2 flex items-center space-x-1.5 text-slate-655 dark:text-slate-400 pt-1 border-t border-slate-100/40 border-dashed">
                              <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">Tarifa Acordada:</span>
                              <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                                {alloc.tarifa_acordada ? `${Number(alloc.tarifa_acordada).toFixed(2)} €/h` : 'N/A'}
                              </span>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
              <Users className="h-16 w-16 text-slate-300 dark:text-slate-700" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nenhum Pedido Selecionado</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Selecione um pedido na barra lateral esquerda para visualizar os cargos necessários e iniciar as alocações.
              </p>
            </div>
          )}

        </div>

      </div>

      <AllocateWorkerDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          refetchPedidos();
          refetchAllocations();
        }} 
        position={selectedPosition} 
      />
    </div>
  );
};
