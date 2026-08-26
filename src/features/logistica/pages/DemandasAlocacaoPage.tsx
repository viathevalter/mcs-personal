import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  Filter,
  ArrowRight,
  Home,
  Building,
  Building2,
  UserPlus,
  RefreshCw,
  LogOut,
  Sparkles,
  AlertTriangle,
  Calendar,
  Bed,
  Check,
  UserCheck,
  Phone,
  Briefcase,
  X,
  Plus,
  Trash2,
  Layers,
  Lock,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  SlidersHorizontal,
  Mail,
  User
} from 'lucide-react';
import { logisticsService } from '../services/logisticsService';
import type {
  Alojamento,
  Cama,
  PedidoDemandaLogistica,
  TrabalhadorDemandaItem,
  TrabalhadorAlojado
} from '../services/logisticsService';

export const DemandasAlocacaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demandas' | 'alojados'>('demandas');
  const [pedidos, setPedidos] = useState<PedidoDemandaLogistica[]>([]);
  const [alojados, setAlojados] = useState<TrabalhadorAlojado[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [camasDisponiveis, setCamasDisponiveis] = useState<Cama[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros de Pedidos
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendentes' | 'alojados'>('todos');
  const [selectedPedidoId, setSelectedPedidoId] = useState<string | null>(null);

  // Seleção Múltipla para Alocação em Lote
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchAlojamentoId, setBatchAlojamentoId] = useState('');
  const [isAllocatingBatch, setIsAllocatingBatch] = useState(false);

  // Modal Alocação Individual
  const [allocatingWorker, setAllocatingWorker] = useState<{
    worker: TrabalhadorDemandaItem;
    pedido: PedidoDemandaLogistica;
  } | null>(null);
  const [singleAlojamentoId, setSingleAlojamentoId] = useState('');
  const [singleCamaId, setSingleCamaId] = useState('');
  const [singleDataInicio, setSingleDataInicio] = useState('');
  const [singleDataFim, setSingleDataFim] = useState('');
  const [singleObservacoes, setSingleObservacoes] = useState('');
  const [isAllocatingSingle, setIsAllocatingSingle] = useState(false);

  // Modal Asignación Directa de Trabalhador Avulso (Busca no Banco)
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingWorkers, setIsSearchingWorkers] = useState(false);
  const [selectedRealWorker, setSelectedRealWorker] = useState<any | null>(null);
  const [directAlojamentoId, setDirectAlojamentoId] = useState('');
  const [directCamaId, setDirectCamaId] = useState('');
  const [directDataInicio, setDirectDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [directDataFim, setDirectDataFim] = useState('');
  const [directObservacoes, setDirectObservacoes] = useState('');

  // Check-out Modal
  const [checkingOutWorker, setCheckingOutWorker] = useState<{
    alocacaoId: string;
    workerNome: string;
    alojamentoNome: string;
  } | null>(null);
  const [motivoCheckout, setMotivoCheckout] = useState<string>('Fin de Pedido / Obra');
  const [dataSaidaEfetiva, setDataSaidaEfetiva] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pedidosData, alojadosData, alojData, camasData] = await Promise.all([
        logisticsService.fetchDemandasPorPedido(),
        logisticsService.fetchTrabalhadoresAlojados(),
        logisticsService.fetchAlojamentos(),
        logisticsService.fetchCamas()
      ]);

      setPedidos(pedidosData);
      setAlojados(alojadosData);
      setAlojamentos(alojData);
      setCamasDisponiveis(camasData.filter(c => c.status === 'livre'));

      // Se nenhum selecionado e houver pedidos, seleciona o primeiro
      if (pedidosData.length > 0 && !selectedPedidoId) {
        setSelectedPedidoId(pedidosData[0].pedido_id);
      }
    } catch (err) {
      console.error('Error al cargar datos de logística:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Busca rápida de colaboradores no banco
  useEffect(() => {
    if (!isDirectModalOpen) return;
    const timer = setTimeout(async () => {
      setIsSearchingWorkers(true);
      try {
        const results = await logisticsService.searchTrabalhadores(workerSearchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingWorkers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [workerSearchQuery, isDirectModalOpen]);

  // Pedido atualmente selecionado
  const selectedPedido = useMemo(() => {
    if (!selectedPedidoId) return pedidos[0] || null;
    return pedidos.find(p => p.pedido_id === selectedPedidoId) || pedidos[0] || null;
  }, [pedidos, selectedPedidoId]);

  // Pedidos Filtrados na Coluna Esquerda
  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || (
        p.cliente_nome.toLowerCase().includes(q) ||
        p.pedido_codigo.toLowerCase().includes(q) ||
        p.empresa_contratante.toLowerCase().includes(q) ||
        p.obra_nome.toLowerCase().includes(q) ||
        p.cidade.toLowerCase().includes(q) ||
        p.trabalhadores.some(t => t.worker_nome.toLowerCase().includes(q) || t.codigo_colab.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (filterStatus === 'pendentes') return p.total_pendentes_alojamento > 0;
      if (filterStatus === 'alojados') return p.total_pendentes_alojamento === 0 && p.total_alojados > 0;
      return true;
    });
  }, [pedidos, searchTerm, filterStatus]);

  // Contadores globais
  const totalPedidosPendentes = useMemo(() => {
    return pedidos.filter(p => p.total_pendentes_alojamento > 0).length;
  }, [pedidos]);

  const totalTrabalhadoresPendentes = useMemo(() => {
    return pedidos.reduce((acc, p) => acc + p.total_pendentes_alojamento, 0);
  }, [pedidos]);

  // Abrir modal de alocação individual
  const handleOpenSingleAlloc = (worker: TrabalhadorDemandaItem, pedido: PedidoDemandaLogistica) => {
    setAllocatingWorker({ worker, pedido });
    setSingleDataInicio(worker.data_inicio || pedido.data_inicio || new Date().toISOString().split('T')[0]);
    setSingleDataFim(worker.data_fim || pedido.data_fim || '');
    setSingleObservacoes(`Alocación Pedido ${pedido.pedido_codigo} - ${pedido.cliente_nome}`);
    
    // Tenta pré-selecionar alojamento da mesma cidade se existir
    const matchingAloj = alojamentos.find(a => 
      a.municipio?.toLowerCase().includes(pedido.cidade.toLowerCase()) ||
      pedido.cidade.toLowerCase().includes(a.municipio?.toLowerCase() || '')
    );
    if (matchingAloj) {
      setSingleAlojamentoId(matchingAloj.id);
      const firstBed = camasDisponiveis.find(c => c.alojamento_id === matchingAloj.id);
      if (firstBed) setSingleCamaId(firstBed.id);
    } else {
      setSingleAlojamentoId(alojamentos[0]?.id || '');
      const firstBed = camasDisponiveis.find(c => c.alojamento_id === alojamentos[0]?.id);
      if (firstBed) setSingleCamaId(firstBed.id);
    }
  };

  // Confirmar Alocação Individual
  const handleConfirmSingleAlloc = async () => {
    if (!allocatingWorker || !singleAlojamentoId || !singleCamaId) {
      alert('Por favor, seleccione un alojamiento y una cama disponible.');
      return;
    }

    try {
      setIsAllocatingSingle(true);
      await logisticsService.alocarTrabalhador({
        cama_id: singleCamaId,
        alojamento_id: singleAlojamentoId,
        worker_id: allocatingWorker.worker.worker_id,
        worker_nome: allocatingWorker.worker.worker_nome,
        codigo_colab: allocatingWorker.worker.codigo_colab,
        cliente_nome: allocatingWorker.pedido.cliente_nome,
        obra_nome: allocatingWorker.pedido.obra_nome,
        pedido_id: allocatingWorker.pedido.pedido_id,
        pedido_codigo: allocatingWorker.pedido.pedido_codigo,
        data_inicio: singleDataInicio,
        data_fim: singleDataFim,
        observacoes: singleObservacoes
      });

      setAllocatingWorker(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al asignar el alojamiento: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsAllocatingSingle(false);
    }
  };

  // Abrir Modal de Alocação em Lote
  const handleOpenBatchAlloc = () => {
    if (selectedWorkerIds.length === 0) {
      alert('Seleccione al menos un trabajador para asignar en lote.');
      return;
    }
    if (selectedPedido) {
      const matchCity = alojamentos.find(a => 
        a.municipio?.toLowerCase().includes(selectedPedido.cidade.toLowerCase())
      );
      setBatchAlojamentoId(matchCity?.id || alojamentos[0]?.id || '');
    }
    setIsBatchModalOpen(true);
  };

  // Confirmar Alocação em Lote
  const handleConfirmBatchAlloc = async () => {
    if (!selectedPedido || !batchAlojamentoId) return;

    const camasLivresDoAloj = camasDisponiveis.filter(c => c.alojamento_id === batchAlojamentoId);
    if (camasLivresDoAloj.length < selectedWorkerIds.length) {
      alert(`El alojamiento seleccionado solo tiene ${camasLivresDoAloj.length} camas libres, pero ha seleccionado ${selectedWorkerIds.length} trabajadores.`);
      return;
    }

    try {
      setIsAllocatingBatch(true);
      const itemsToAlloc = selectedWorkerIds.map((wId, idx) => {
        const w = selectedPedido.trabalhadores.find(t => t.worker_id === wId)!;
        return {
          worker_id: w.worker_id,
          worker_nome: w.worker_nome,
          codigo_colab: w.codigo_colab,
          cama_id: camasLivresDoAloj[idx].id
        };
      });

      await logisticsService.alocarGrupoEmAlojamento(itemsToAlloc, batchAlojamentoId, {
        pedido_id: selectedPedido.pedido_id,
        pedido_codigo: selectedPedido.pedido_codigo,
        cliente_nome: selectedPedido.cliente_nome,
        obra_nome: selectedPedido.obra_nome,
        data_inicio: selectedPedido.data_inicio,
        data_fim: selectedPedido.data_fim,
        observacoes: `Asignación en Lote - Pedido ${selectedPedido.pedido_codigo}`
      });

      setSelectedWorkerIds([]);
      setIsBatchModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error en la asignación en lote: ' + err.message);
    } finally {
      setIsAllocatingBatch(false);
    }
  };

  // Confirmar Alocação Direta Avulsa (Modal Azul)
  const handleConfirmDirectAlloc = async () => {
    if (!selectedRealWorker || !directAlojamentoId || !directCamaId) {
      alert('Por favor, seleccione el colaborador, el alojamiento y la cama.');
      return;
    }

    try {
      await logisticsService.alocarTrabalhador({
        cama_id: directCamaId,
        alojamento_id: directAlojamentoId,
        worker_id: selectedRealWorker.id,
        worker_nome: selectedRealWorker.Nombre || selectedRealWorker.nombre,
        codigo_colab: selectedRealWorker.Cod_colab || selectedRealWorker.cod_colab,
        cliente_nome: selectedRealWorker.contratante || 'Cliente Principal',
        obra_nome: selectedRealWorker.ubicacion || 'Obra',
        data_inicio: directDataInicio,
        data_fim: directDataFim,
        observacoes: directObservacoes
      });

      setIsDirectModalOpen(false);
      setSelectedRealWorker(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al asignar el trabajador: ' + err.message);
    }
  };

  // Confirmar Check-out
  const handleConfirmCheckout = async () => {
    if (!checkingOutWorker) return;
    try {
      setIsProcessingCheckout(true);
      await logisticsService.checkoutTrabalhador(checkingOutWorker.alocacaoId, motivoCheckout);
      setCheckingOutWorker(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error al procesar check-out: ' + err.message);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  // Alternar seleção de trabalhador para lote
  const toggleSelectWorker = (workerId: string) => {
    setSelectedWorkerIds(prev => 
      prev.includes(workerId) ? prev.filter(id => id !== workerId) : [...prev, workerId]
    );
  };

  const selectAllPendingInPedido = () => {
    if (!selectedPedido) return;
    const pendingIds = selectedPedido.trabalhadores
      .filter(t => t.status_alocacao === 'pendente')
      .map(t => t.worker_id);

    if (selectedWorkerIds.length === pendingIds.length) {
      setSelectedWorkerIds([]);
    } else {
      setSelectedWorkerIds(pendingIds);
    }
  };

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header Superior com Estatísticas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            <Building2 className="text-blue-600" size={26} />
            Central de Demandas por Pedido & Alojamientos
          </h1>
          <p className="text-sm text-slate-500">
            Control de movilizaciones, asignación de plazas por pedido comercial y seguimiento de check-outs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsDirectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <UserPlus size={15} />
            Asignar Trabajador (Búsqueda Directa)
          </button>
        </div>
      </div>

      {/* Abas Principais */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('demandas')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'demandas'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <Building size={16} />
            Demandas por Pedido Comercial
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'demandas'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {totalTrabalhadoresPendentes} plazas pendientes
            </span>
          </button>

          <button
            onClick={() => setActiveTab('alojados')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'alojados'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck size={16} />
            Trabajadores Alojados & Check-outs
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
              {alojados.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: DEMANDAS POR PEDIDO COMERCIAL (VISÃO PRINCIPAL) */}
      {/* ========================================================================= */}
      {activeTab === 'demandas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA (5 COLUNAS): LISTA DE PEDIDOS */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Barra de Busca e Filtros de Pedidos */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, pedido, empresa, ciudad, obra..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'pendentes', label: `Pendientes (${totalPedidosPendentes})` },
                  { key: 'alojados', label: 'Completos' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key as any)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      filterStatus === tab.key
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Cards de Pedidos */}
            <div className="space-y-3 max-h-[740px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
              {isLoading ? (
                <div className="p-12 text-center text-slate-500 space-y-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-xs font-semibold">Cargando pedidos de la operación...</p>
                </div>
              ) : filteredPedidos.length === 0 ? (
                <div className="p-8 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
                  <Building size={28} className="mx-auto text-slate-400" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Ningún pedido encontrado</p>
                  <p className="text-xs text-slate-400">Pruebe ajustando los filtros de búsqueda.</p>
                </div>
              ) : (
                filteredPedidos.map(pedido => {
                  const isSelected = selectedPedido?.pedido_id === pedido.pedido_id;
                  const isComplete = pedido.total_pendentes_alojamento === 0 && pedido.total_alojados > 0;

                  return (
                    <div
                      key={pedido.pedido_id}
                      onClick={() => {
                        setSelectedPedidoId(pedido.pedido_id);
                        setSelectedWorkerIds([]);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative overflow-hidden ${
                        isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Top Bar do Card com Código e Empresa */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {pedido.pedido_codigo}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                            {pedido.empresa_contratante}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isComplete
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {isComplete ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                          {isComplete ? '100% Alojado' : `${pedido.total_pendentes_alojamento} sin alojar`}
                        </span>
                      </div>

                      {/* Cliente & Obra */}
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white text-sm">
                          {pedido.cliente_nome}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-rose-500 flex-shrink-0" />
                          <span className="truncate">{pedido.obra_nome} • {pedido.cidade}</span>
                        </p>
                      </div>

                      {/* Data de Início e Dias Restantes */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar size={13} className="text-blue-500" />
                          <span>Inicio: <strong>{pedido.data_inicio}</strong></span>
                        </div>

                        <span className={`text-[11px] font-bold ${
                          pedido.dias_restantes <= 5 ? 'text-red-600' : 'text-slate-500'
                        }`}>
                          {pedido.dias_restantes > 0 ? `Faltan ${pedido.dias_restantes}d` : 'Iniciado'}
                        </span>
                      </div>

                      {/* Barra de Progresso de Alojamento */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Plazas asignadas</span>
                          <span>{pedido.total_alojados} de {pedido.total_contratados} trabajadores</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isComplete ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{
                              width: `${pedido.total_contratados > 0 ? (pedido.total_alojados / pedido.total_contratados) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (7 COLUNAS): DETALHES DO PEDIDO SELECIONADO & GESTÃO DE VAGAS */}
          <div className="lg:col-span-7 space-y-5">
            {selectedPedido ? (
              <div className="space-y-5">
                
                {/* 1. BANNER UNIFICADO DO PEDIDO (PASTEL / CLARO / DARK ADAPTATIVO COM TIMELINE) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                  
                  {/* Linha Superior: Código, Empresa, Cliente e Localização */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800/60">
                          {selectedPedido.pedido_codigo}
                        </span>

                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                          Empresa: {selectedPedido.empresa_contratante}
                        </span>

                        {selectedPedido.dias_restantes > 0 ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 flex items-center gap-1">
                            <Clock size={12} />
                            Faltan {selectedPedido.dias_restantes} días
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            En ejecución
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {selectedPedido.cliente_nome}
                      </h2>

                      <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                        <MapPin size={14} className="text-rose-500 flex-shrink-0" />
                        <strong className="text-slate-800 dark:text-slate-200">{selectedPedido.obra_nome}</strong>
                        <span>•</span>
                        <span>{selectedPedido.endereco_completo} ({selectedPedido.cidade}{selectedPedido.codigo_postal ? `, ${selectedPedido.codigo_postal}` : ''})</span>
                      </p>
                    </div>

                    {/* Contatos do Encarregado e Cliente */}
                    <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 text-xs">
                      {selectedPedido.encarregado_nome && (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          <User size={13} className="text-blue-600" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">Encarregado de Obra</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">{selectedPedido.encarregado_nome}</span>
                          </div>
                          {selectedPedido.encarregado_telefone && (
                            <a
                              href={`https://wa.me/${selectedPedido.encarregado_telefone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-1 p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors"
                              title="WhatsApp do Encarregado"
                            >
                              <Phone size={12} />
                            </a>
                          )}
                        </div>
                      )}

                      {selectedPedido.cliente_telefone && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <span>Tel. Cliente:</span>
                          <a
                            href={`tel:${selectedPedido.cliente_telefone}`}
                            className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            <Phone size={11} />
                            {selectedPedido.cliente_telefone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Linha Inferior: Banner Timeline Pastel (Início Previsto, Duração e Fim Previsto) */}
                  <div className="bg-slate-50/90 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Início Previsto */}
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-2xl shadow-2xs">
                        <Calendar size={22} />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Inicio Previsto
                        </span>
                        <p className="text-base font-black text-slate-900 dark:text-white">
                          {selectedPedido.data_inicio}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {selectedPedido.data_inicio_diasemana || 'Fecha de inicio'}
                        </p>
                      </div>
                    </div>

                    {/* Duração Central */}
                    <div className="flex-1 flex flex-col items-center justify-center px-4">
                      <span className="px-3.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                        ⏱️ Duración: {selectedPedido.duracao_texto}
                      </span>
                      <div className="w-full flex items-center mt-2 max-w-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></div>
                        <div className="flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-700 mx-1"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-2 ring-emerald-200"></div>
                      </div>
                    </div>

                    {/* Fim Previsto */}
                    <div className="flex items-center gap-3 justify-end text-right">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Fin Previsto
                        </span>
                        <p className="text-base font-black text-slate-900 dark:text-white">
                          {selectedPedido.data_fim || 'No definido'}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {selectedPedido.data_fim_diasemana || 'Sin fecha de cierre'}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-2xl shadow-2xs">
                        <Calendar size={22} />
                      </div>
                    </div>

                  </div>

                </div>

                {/* 2. TABELA DOS TRABALHADORES DO PEDIDO */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs space-y-0">
                  
                  {/* Header da Tabela com Ações em Lote */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedPedido.trabalhadores.filter(t => t.status_alocacao === 'pendente').length > 0 &&
                          selectedWorkerIds.length === selectedPedido.trabalhadores.filter(t => t.status_alocacao === 'pendente').length
                        }
                        onChange={selectAllPendingInPedido}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        title="Seleccionar todos los pendientes"
                      />
                      <div>
                        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Trabajadores Vinculados al Pedido ({selectedPedido.trabalhadores.length})
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          {selectedPedido.total_pendentes_alojamento} pendientes de alojamiento • {selectedPedido.total_alojados} asignados
                        </p>
                      </div>
                    </div>

                    {selectedWorkerIds.length > 0 && (
                      <button
                        onClick={handleOpenBatchAlloc}
                        className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs animate-in fade-in"
                      >
                        <Bed size={14} />
                        Asignar Grupo al Mismo Alojamiento ({selectedWorkerIds.length})
                      </button>
                    )}
                  </div>

                  {/* Tabela de Trabalhadores */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="w-8 px-4 py-3"></th>
                          <th className="px-4 py-3">Trabajador</th>
                          <th className="px-4 py-3">Función / Cargo</th>
                          <th className="px-4 py-3">Alojamiento & Cama</th>
                          <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {selectedPedido.trabalhadores.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-400">
                              Aún no hay trabajadores asignados a este pedido en la Contratación.
                            </td>
                          </tr>
                        ) : (
                          selectedPedido.trabalhadores.map(worker => {
                            const isSelected = selectedWorkerIds.includes(worker.worker_id);
                            const isAllocated = worker.status_alocacao === 'alocado';

                            return (
                              <tr
                                key={worker.worker_id}
                                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                                  isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                                }`}
                              >
                                <td className="px-4 py-3.5">
                                  {!isAllocated && (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectWorker(worker.worker_id)}
                                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                    />
                                  )}
                                </td>

                                <td className="px-4 py-3.5">
                                  <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800 dark:text-slate-100">
                                      {worker.worker_nome}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                        {worker.codigo_colab}
                                      </span>
                                      {worker.movil && (
                                        <a
                                          href={`https://wa.me/${worker.movil.replace(/\D/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-semibold"
                                        >
                                          <Phone size={10} />
                                          {worker.movil}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5">
                                  <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                    {worker.funcao}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5">
                                  {isAllocated ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        <CheckCircle2 size={11} />
                                        {worker.alocacao_detalhe?.alojamento_nome}
                                      </span>
                                      <p className="text-[10px] text-slate-400">
                                        {worker.alocacao_detalhe?.cama_identificador}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                      <AlertTriangle size={11} />
                                      Sin Alojamiento
                                    </span>
                                  )}
                                </td>

                                <td className="px-4 py-3.5 text-right">
                                  {isAllocated ? (
                                    <button
                                      onClick={() => {
                                        setCheckingOutWorker({
                                          alocacaoId: worker.alocacao_detalhe!.alocacao_id,
                                          workerNome: worker.worker_nome,
                                          alojamentoNome: worker.alocacao_detalhe!.alojamento_nome
                                        });
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors inline-flex items-center gap-1"
                                    >
                                      <LogOut size={12} />
                                      Check-out
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenSingleAlloc(worker, selectedPedido)}
                                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs inline-flex items-center gap-1"
                                    >
                                      <Bed size={13} />
                                      Asignar Cama
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-3 shadow-xs">
                <Building2 size={36} className="mx-auto text-slate-300" />
                <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">Seleccione un Pedido Comercial</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Haga clic en uno de los pedidos de la columna izquierda para ver la ubicación, fechas y asignar los alojamientos a sus trabajadores.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TRABALHADORES ALOJADOS & CHECK-OUTS */}
      {/* ========================================================================= */}
      {activeTab === 'alojados' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                Ocupación General de Alojamientos ({alojados.length} activos)
              </h2>
              <p className="text-xs text-slate-500">Histórico de entradas, control de llaves y gestión de salidas.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 uppercase text-[10px] font-bold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Trabajador</th>
                  <th className="px-4 py-3">Cliente & Obra</th>
                  <th className="px-4 py-3">Alojamiento & Cama</th>
                  <th className="px-4 py-3">Ubicación</th>
                  <th className="px-4 py-3">Check-in / Previsto</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {alojados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      Ningún trabajador alojado actualmente en el sistema.
                    </td>
                  </tr>
                ) : (
                  alojados.map(aloc => (
                    <tr key={aloc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-100">{aloc.worker_nome}</p>
                        <span className="text-[10px] font-mono text-slate-500">{aloc.codigo_colab}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{aloc.cliente_nome}</p>
                        <p className="text-[10px] text-slate-400">{aloc.obra_nome}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/40 rounded-lg">
                            <Home size={13} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">{aloc.alojamento_nome}</p>
                            <p className="text-[10px] text-slate-400">{aloc.cama_identificador}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{aloc.municipio}, {aloc.provincia}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                        <p className="font-medium">Desde: {aloc.data_checkin}</p>
                        {aloc.data_checkout_prevista && (
                          <p className="text-[10px] text-slate-400">Hasta: {aloc.data_checkout_prevista}</p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setCheckingOutWorker({
                              alocacaoId: aloc.alocacao_id,
                              workerNome: aloc.worker_nome,
                              alojamentoNome: aloc.alojamento_nome
                            });
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        >
                          <LogOut size={13} />
                          Check-out
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ALOCAÇÃO INDIVIDUAL */}
      {/* ========================================================================= */}
      {allocatingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
                  <Bed size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Asignar Alojamiento a Trabajador
                  </h3>
                  <p className="text-xs text-slate-500">
                    {allocatingWorker.worker.worker_nome} • {allocatingWorker.pedido.pedido_codigo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllocatingWorker(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">
                  📍 Destino de la Obra
                </span>
                <p className="font-bold text-slate-800 dark:text-slate-100">
                  {allocatingWorker.pedido.cliente_nome} — {allocatingWorker.pedido.obra_nome}
                </p>
                <p className="text-slate-500 text-[11px]">{allocatingWorker.pedido.endereco_completo}</p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  1. Seleccione el Alojamiento:
                </label>
                <select
                  value={singleAlojamentoId}
                  onChange={e => {
                    setSingleAlojamentoId(e.target.value);
                    const firstBed = camasDisponiveis.find(c => c.alojamento_id === e.target.value);
                    if (firstBed) setSingleCamaId(firstBed.id);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar Alojamiento --</option>
                  {alojamentos.map(aloj => {
                    const vagasLivres = camasDisponiveis.filter(c => c.alojamento_id === aloj.id).length;
                    const isSameCity = aloj.municipio?.toLowerCase().includes(allocatingWorker.pedido.cidade.toLowerCase());
                    return (
                      <option key={aloj.id} value={aloj.id}>
                        {aloj.nome} ({aloj.municipio || 'España'}) — {vagasLivres} camas libres {isSameCity ? '⭐ Ciudad Coincidente' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  2. Cama / Habitación Disponible:
                </label>
                <select
                  value={singleCamaId}
                  onChange={e => setSingleCamaId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Seleccionar Cama --</option>
                  {camasDisponiveis
                    .filter(c => c.alojamento_id === singleAlojamentoId)
                    .map(cama => (
                      <option key={cama.id} value={cama.id}>
                        {cama.identificador} ({cama.tipo === 'dupla' ? 'Cama Doble' : 'Individual'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">Fecha Check-in:</label>
                  <input
                    type="date"
                    value={singleDataInicio}
                    onChange={e => setSingleDataInicio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block">Fecha Prevista Fin:</label>
                  <input
                    type="date"
                    value={singleDataFim}
                    onChange={e => setSingleDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setAllocatingWorker(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isAllocatingSingle || !singleCamaId}
                onClick={handleConfirmSingleAlloc}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isAllocatingSingle ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ALOCAÇÃO EM LOTE */}
      {/* ========================================================================= */}
      {isBatchModalOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Asignación en Lote ({selectedWorkerIds.length} Trabajadores)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pedido {selectedPedido.pedido_codigo} • {selectedPedido.cliente_nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Seleccione el inmueble donde se hospedarán los {selectedWorkerIds.length} trabajadores. El sistema distribuirá automáticamente las camas libres disponibles.
              </p>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Trabajadores a hospedar:</span>
                {selectedWorkerIds.map(id => {
                  const w = selectedPedido.trabalhadores.find(t => t.worker_id === id);
                  return (
                    <div key={id} className="flex justify-between items-center text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                      <span>• {w?.worker_nome}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{w?.codigo_colab}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Alojamiento Destino:
                </label>
                <select
                  value={batchAlojamentoId}
                  onChange={e => setBatchAlojamentoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Seleccionar Alojamiento --</option>
                  {alojamentos.map(aloj => {
                    const vagasLivres = camasDisponiveis.filter(c => c.alojamento_id === aloj.id).length;
                    const hasEnough = vagasLivres >= selectedWorkerIds.length;
                    const isSameCity = aloj.municipio?.toLowerCase().includes(selectedPedido.cidade.toLowerCase());

                    return (
                      <option key={aloj.id} value={aloj.id}>
                        {aloj.nome} ({aloj.municipio || 'España'}) — {vagasLivres} camas libres {hasEnough ? '✓ Capacidad OK' : '⚠ Insuficiente'} {isSameCity ? '⭐ Ciudad Obra' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>
                  Fechas automáticas del pedido: <strong>{selectedPedido.data_inicio}</strong> hasta <strong>{selectedPedido.data_fim || 'Fin previsto'}</strong>.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isAllocatingBatch || !batchAlojamentoId}
                onClick={handleConfirmBatchAlloc}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isAllocatingBatch ? 'Asignando Grupo...' : `Confirmar Asignación de los ${selectedWorkerIds.length} Trabajadores`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ASIGNACIÓN DIRECTA DE TRABAJADOR REAL */}
      {/* ========================================================================= */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-0">
            
            <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Asignación Directa de Colaborador
                  </h3>
                  <p className="text-xs text-slate-500">Búsqueda directa en la base de colaboradores activos de España.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDirectModalOpen(false);
                  setSelectedRealWorker(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              {!selectedRealWorker ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o código (ej: E2105)..."
                      value={workerSearchQuery}
                      onChange={e => setWorkerSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {isSearchingWorkers ? (
                      <div className="p-8 text-center text-slate-400">Buscando colaboradores...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">Ningún colaborador encontrado.</div>
                    ) : (
                      searchResults.map((w: any) => (
                        <div
                          key={w.id}
                          onClick={() => setSelectedRealWorker(w)}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 cursor-pointer flex justify-between items-center transition-all"
                        >
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">{w.Nombre || w.nombre}</p>
                            <p className="text-[11px] text-slate-400">{w.funcion || 'Especialista'} • {w.ubicacion || 'España'}</p>
                          </div>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-600">
                            {w.Cod_colab || w.cod_colab}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">{selectedRealWorker.Nombre || selectedRealWorker.nombre}</p>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300">{selectedRealWorker.contratante} • {selectedRealWorker.ubicacion}</p>
                    </div>
                    <button
                      onClick={() => setSelectedRealWorker(null)}
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      Cambiar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Alojamiento:</label>
                      <select
                        value={directAlojamentoId}
                        onChange={e => {
                          setDirectAlojamentoId(e.target.value);
                          const firstBed = camasDisponiveis.find(c => c.alojamento_id === e.target.value);
                          if (firstBed) setDirectCamaId(firstBed.id);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      >
                        <option value="">-- Seleccionar --</option>
                        {alojamentos.map(a => (
                          <option key={a.id} value={a.id}>{a.nome} ({a.municipio})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Cama:</label>
                      <select
                        value={directCamaId}
                        onChange={e => setDirectCamaId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      >
                        <option value="">-- Seleccionar --</option>
                        {camasDisponiveis
                          .filter(c => c.alojamento_id === directAlojamentoId)
                          .map(c => (
                            <option key={c.id} value={c.id}>{c.identificador}</option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Check-in:</label>
                      <input
                        type="date"
                        value={directDataInicio}
                        onChange={e => setDirectDataInicio(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Fecha Prevista Salida:</label>
                      <input
                        type="date"
                        value={directDataFim}
                        onChange={e => setDirectDataFim(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedRealWorker && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDirectModalOpen(false);
                    setSelectedRealWorker(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  disabled={!directCamaId}
                  onClick={handleConfirmDirectAlloc}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Confirmar Asignación
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CHECK-OUT */}
      {/* ========================================================================= */}
      {checkingOutWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Procesar Check-out</h3>
                <p className="text-xs text-slate-500">Liberación de cama e inspección de salida.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              ¿Desea registrar la salida de <strong className="text-slate-900 dark:text-white">{checkingOutWorker.workerNome}</strong> del alojamiento <strong className="text-slate-900 dark:text-white">{checkingOutWorker.alojamentoNome}</strong>? La plaza quedará libre inmediatamente.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Motivo del Check-out:</label>
                <select
                  value={motivoCheckout}
                  onChange={e => setMotivoCheckout(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                >
                  <option value="Fin de Pedido / Obra">Fin de Pedido / Obra</option>
                  <option value="Reemplazo por Baja">Reemplazo por Baja Médica / Renuncia</option>
                  <option value="Cambio de Alojamiento">Cambio de Alojamiento / Reubicación</option>
                  <option value="Cancelación de Pedido">Cancelación de Pedido</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Fecha Efectiva de Salida:</label>
                <input
                  type="date"
                  value={dataSaidaEfetiva}
                  onChange={e => setDataSaidaEfetiva(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                disabled={isProcessingCheckout}
                onClick={() => setCheckingOutWorker(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={isProcessingCheckout}
                onClick={handleConfirmCheckout}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <LogOut size={13} />
                {isProcessingCheckout ? 'Procesando...' : 'Confirmar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
