import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  MapPin,
  CheckCircle,
  Clock,
  Filter,
  ArrowRight,
  Home,
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
  FileSpreadsheet
} from 'lucide-react';
import { logisticsService } from '../services/logisticsService';
import type {
  Alojamento,
  Cama,
  DemandaTrabalhador,
  TrabalhadorAlojado
} from '../services/logisticsService';

export const DemandasAlocacaoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demandas' | 'alojados'>('demandas');
  const [demandas, setDemandas] = useState<DemandaTrabalhador[]>([]);
  const [alojados, setAlojados] = useState<TrabalhadorAlojado[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [camasDisponiveis, setCamasDisponiveis] = useState<Cama[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');

  // Seleção e Alocação via Painel Lateral
  const [selectedDemanda, setSelectedDemanda] = useState<DemandaTrabalhador | null>(null);
  const [selectedAlojamentoId, setSelectedAlojamentoId] = useState<string>('');
  const [selectedCamaId, setSelectedCamaId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [isAllocating, setIsAllocating] = useState(false);

  // Modal Alocação Direta de Trabalhador Real
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingWorkers, setIsSearchingWorkers] = useState(false);
  const [selectedRealWorker, setSelectedRealWorker] = useState<any | null>(null);
  const [directAlojamentoId, setDirectAlojamentoId] = useState('');
  const [directCamaId, setDirectCamaId] = useState('');
  const [directCliente, setDirectCliente] = useState('BECK & POLLITZER IBERICA SLU');
  const [directObra, setDirectObra] = useState('Obra Principal');
  const [directDataInicio, setDirectDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [directDataFim, setDirectDataFim] = useState('');
  const [directObservacoes, setDirectObservacoes] = useState('');

  // Check-out Modal
  const [checkingOutWorker, setCheckingOutWorker] = useState<TrabalhadorAlojado | null>(null);
  const [motivoCheckout, setMotivoCheckout] = useState<string>('Término de Pedido / Fim de Obra');
  const [dataSaidaEfetiva, setDataSaidaEfetiva] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vistoriaOk, setVistoriaOk] = useState<boolean>(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [demData, alojadosData, alojData, camasData] = await Promise.all([
        logisticsService.fetchDemandas(),
        logisticsService.fetchTrabalhadoresAlojados(),
        logisticsService.fetchAlojamentos(),
        logisticsService.fetchCamas()
      ]);

      setDemandas(demData);
      setAlojados(alojadosData);
      setAlojamentos(alojData);
      setCamasDisponiveis(camasData.filter(c => c.status === 'livre'));
    } catch (err) {
      console.error('Erro ao carregar dados de logística:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Busca em tempo real de trabalhadores reais no banco
  useEffect(() => {
    if (!isDirectModalOpen) return;
    const timer = setTimeout(async () => {
      setIsSearchingWorkers(true);
      try {
        const res = await logisticsService.searchTrabalhadores(workerSearchQuery);
        setSearchResults(res);
      } catch (e) {
        console.error('Erro na busca de trabalhadores:', e);
      } finally {
        setIsSearchingWorkers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [workerSearchQuery, isDirectModalOpen]);

  // Alocação a partir da lista de Demandas
  const handleConfirmAllocation = async () => {
    if (!selectedDemanda || !selectedCamaId || !selectedAlojamentoId) {
      alert('Selecione um trabalhador, um alojamento e uma cama disponível.');
      return;
    }

    try {
      setIsAllocating(true);
      await logisticsService.alocarTrabalhador({
        cama_id: selectedCamaId,
        alojamento_id: selectedAlojamentoId,
        worker_id: selectedDemanda.worker_id,
        worker_nome: selectedDemanda.worker_nome,
        codigo_colab: selectedDemanda.codigo_colab,
        cliente_nome: selectedDemanda.cliente_nome,
        obra_nome: selectedDemanda.obra_nome,
        data_inicio: dataInicio,
        data_fim: dataFim,
        observacoes: observacoes
      });

      alert(`Trabalhador ${selectedDemanda.worker_nome} alocado com sucesso!`);
      setSelectedDemanda(null);
      setSelectedCamaId('');
      setSelectedAlojamentoId('');
      setObservacoes('');
      loadData();
      setActiveTab('alojados');
    } catch (err: any) {
      console.error('Erro ao alocar:', err);
      alert('Erro ao realizar alocação.');
    } finally {
      setIsAllocating(false);
    }
  };

  // Alocação Direta de Trabalhador Real
  const handleDirectAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRealWorker || !directAlojamentoId || !directCamaId) {
      alert('Selecione um trabalhador, um alojamento e uma cama disponível.');
      return;
    }

    try {
      setIsAllocating(true);
      await logisticsService.alocarTrabalhador({
        cama_id: directCamaId,
        alojamento_id: directAlojamentoId,
        worker_id: selectedRealWorker.id?.toString(),
        worker_nome: selectedRealWorker.Nombre,
        codigo_colab: selectedRealWorker.Cod_colab || 'E-XXXX',
        cliente_nome: directCliente,
        obra_nome: directObra,
        data_inicio: directDataInicio,
        data_fim: directDataFim,
        observacoes: directObservacoes
      });

      alert(`✅ Trabalhador ${selectedRealWorker.Nombre} alocado com sucesso no alojamento!`);
      setIsDirectModalOpen(false);
      setSelectedRealWorker(null);
      setDirectAlojamentoId('');
      setDirectCamaId('');
      setWorkerSearchQuery('');
      loadData();
      setActiveTab('alojados');
    } catch (err) {
      console.error('Erro ao alocar trabalhador real:', err);
      alert('Erro ao realizar alocação.');
    } finally {
      setIsAllocating(false);
    }
  };

  // Check-out de Trabalhador
  const handleConfirmCheckout = async () => {
    if (!checkingOutWorker) return;

    try {
      setIsProcessingCheckout(true);
      await logisticsService.checkoutTrabalhador(checkingOutWorker.alocacao_id, motivoCheckout);
      alert(`Check-out de ${checkingOutWorker.worker_nome} concluído. Cama liberada no inventário!`);
      setCheckingOutWorker(null);
      loadData();
    } catch (err) {
      console.error('Erro ao realizar checkout:', err);
      alert('Erro ao realizar checkout.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleResetAlocacoes = async () => {
    if (confirm('Deseja zerar todas as alocações para iniciar os testes do zero?')) {
      await logisticsService.clearAllAlocacoes();
      alert('Alocações zeradas com sucesso!');
      loadData();
    }
  };

  // Filtro de Demandas
  const filteredDemandas = demandas.filter(d => {
    const matches =
      d.worker_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.codigo_colab.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.municipio.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matches) return false;
    if (tipoFilter === 'pedidos') return d.tipo_solicitacao === 'Novo Pedido';
    if (tipoFilter === 'reemplazos') return d.tipo_solicitacao === 'Reemplazo';
    return true;
  });

  // Filtro de Alojados
  const filteredAlojados = alojados.filter(a =>
    a.worker_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.codigo_colab.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.alojamento_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.municipio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sugestor Inteligente por Proximidade
  const targetCity = selectedDemanda?.municipio?.toLowerCase() || '';
  const sortedAlojamentos = [...alojamentos].sort((a, b) => {
    const matchA = (a.municipio || '').toLowerCase().includes(targetCity);
    const matchB = (b.municipio || '').toLowerCase().includes(targetCity);
    if (matchA && !matchB) return -1;
    if (!matchA && matchB) return 1;
    return 0;
  });

  const camasFiltradas = camasDisponiveis.filter(c => c.alojamento_id === selectedAlojamentoId);
  const directCamasFiltradas = camasDisponiveis.filter(c => c.alojamento_id === directAlojamentoId);

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Central de Demandas & Ocupação de Alojamentos
              </h1>
              <p className="text-xs text-slate-500">
                Atendimento de pedidos e reemplazos, alocação direta de trabalhadores cadastrados e gestão de check-outs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDirectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <UserPlus size={16} />
            Alocar Trabalhador (Busca Direta)
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors shadow-xs"
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('demandas')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'demandas'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <UserPlus size={16} />
          <span>Aguardando Alocação (Pedidos & Reemplazos)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            {demandas.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('alojados')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
            activeTab === 'alojados'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          <UserCheck size={16} />
          <span>Trabalhadores Alojados & Check-outs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            {alojados.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: DEMANDAS & REEMPLAZOS AGUARDANDO ALOCAÇÃO                          */}
      {/* ========================================================================= */}
      {activeTab === 'demandas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda (7 colunas): Lista de Demandas */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Buscar por trabalhador, obra ou cidade..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
                  <button
                    onClick={() => setTipoFilter('todos')}
                    className={`px-3 py-1 rounded-lg transition-colors flex-1 sm:flex-initial text-center ${
                      tipoFilter === 'todos' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setTipoFilter('pedidos')}
                    className={`px-3 py-1 rounded-lg transition-colors flex-1 sm:flex-initial text-center ${
                      tipoFilter === 'pedidos' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Novos Pedidos
                  </button>
                  <button
                    onClick={() => setTipoFilter('reemplazos')}
                    className={`px-3 py-1 rounded-lg transition-colors flex-1 sm:flex-initial text-center ${
                      tipoFilter === 'reemplazos' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Reemplazos
                  </button>
                </div>
              </div>

              {/* Lista */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    Carregando demandas operacionais...
                  </div>
                ) : filteredDemandas.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <CheckCircle size={32} className="mx-auto text-emerald-500" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">Nenhum trabalhador pendente de alocação nesta lista</p>
                    <p className="text-xs">Para alocar qualquer trabalhador ativo da empresa, use o botão <strong>"Alocar Trabalhador (Busca Direta)"</strong> no topo.</p>
                  </div>
                ) : (
                  filteredDemandas.map(d => {
                    const isSelected = selectedDemanda?.id === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDemanda(d);
                          const matchCity = alojamentos.find(a =>
                            (a.municipio || '').toLowerCase().includes(d.municipio.toLowerCase())
                          );
                          if (matchCity) {
                            setSelectedAlojamentoId(matchCity.id);
                          } else if (alojamentos.length > 0) {
                            setSelectedAlojamentoId(alojamentos[0].id);
                          }
                          setSelectedCamaId('');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                                {d.codigo_colab}
                              </span>
                              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                                {d.worker_nome}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                              <Briefcase size={12} className="text-slate-400" />
                              {d.funcao}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                d.tipo_solicitacao === 'Reemplazo'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              }`}
                            >
                              {d.tipo_solicitacao}
                            </span>
                            {d.urgencia === 'Crítica' && (
                              <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                <AlertTriangle size={11} />
                                Urgente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dados da Obra & Localização */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Cliente & Obra</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {d.cliente_nome}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">{d.obra_nome}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Cidade / Início</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <MapPin size={12} className="text-blue-500" />
                              {d.municipio}, {d.pais}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400" />
                              Início: {d.data_inicio}
                            </span>
                          </div>
                        </div>

                        {d.observacoes && (
                          <p className="mt-2 text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                            📌 {d.observacoes}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita (5 colunas): Painel de Alocação & Sugestão por Proximidade */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Bed className="text-blue-600" size={18} />
                  Alocar Trabalhador
                </h2>
                {selectedDemanda && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                    {selectedDemanda.codigo_colab}
                  </span>
                )}
              </div>

              {selectedDemanda ? (
                <div className="space-y-4 text-xs">
                  {/* Card do Trabalhador Selecionado */}
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-1">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Trabalhador em Foco:</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedDemanda.worker_nome}</p>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Destino: <strong>{selectedDemanda.cliente_nome}</strong> ({selectedDemanda.municipio})
                    </p>
                  </div>

                  {/* 1. Seleção de Alojamento com Sugestão de Proximidade */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      1. Alojamento Sugerido (Proximidade):
                    </label>
                    <select
                      value={selectedAlojamentoId}
                      onChange={e => {
                        setSelectedAlojamentoId(e.target.value);
                        setSelectedCamaId('');
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    >
                      <option value="">Selecione um imóvel...</option>
                      {sortedAlojamentos.map(a => {
                        const isSameCity = (a.municipio || '').toLowerCase().includes(targetCity);
                        return (
                          <option key={a.id} value={a.id}>
                            {isSameCity ? '⭐ [Recomendado Próximo] ' : ''}
                            {a.codigo} - {a.nome} ({a.municipio || 'Espanha'}) - Cap: {a.capacidade_pessoas} pax
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Seleção de Cama / Quarto Disponível */}
                  {selectedAlojamentoId && (
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        2. Cama / Quarto Livre:
                      </label>
                      {camasFiltradas.length === 0 ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px]">
                          ⚠️ Todas as camas deste imóvel já estão ocupadas. Selecione outro alojamento.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                          {camasFiltradas.map(c => {
                            const isCamaSelected = selectedCamaId === c.id;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedCamaId(c.id)}
                                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                                  isCamaSelected
                                    ? 'border-blue-600 bg-blue-600 text-white font-bold'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 text-xs">
                                  <Bed size={14} />
                                  {c.identificador}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isCamaSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}>
                                  Livre
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Datas de Vigência da Locação */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Data Check-in:
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Previsão Saída:
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={e => setDataFim(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Botão de Confirmação */}
                  <button
                    type="button"
                    onClick={handleConfirmAllocation}
                    disabled={!selectedCamaId || isAllocating}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    {isAllocating ? 'Processando Check-in...' : 'Confirmar Check-in & Alocação'}
                  </button>
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 text-xs space-y-3">
                  <Users size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Nenhum trabalhador selecionado</p>
                  <p>Selecione um trabalhador da lista ao lado para ver os alojamentos sugeridos com vagas livres, ou clique em <strong>"Alocar Trabalhador (Busca Direta)"</strong> no topo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TRABALHADORES ALOJADOS & CHECK-OUTS (OCUPAÇÃO ATUAL)               */}
      {/* ========================================================================= */}
      {activeTab === 'alojados' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar trabalhador alojado, imóvel ou cliente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-500">
                Total: <strong>{filteredAlojados.length}</strong> colaboradores alojados
              </div>
              {filteredAlojados.length > 0 && (
                <button
                  onClick={handleResetAlocacoes}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg transition-colors"
                >
                  Zerar Alocações
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-16 text-center text-slate-500">Carregando ocupação atual...</div>
            ) : filteredAlojados.length === 0 ? (
              <div className="p-16 text-center text-slate-500 space-y-3">
                <Home size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p className="font-bold text-slate-700 dark:text-slate-300">Nenhum trabalhador alojado no momento</p>
                <p className="text-xs text-slate-400">Clique em <strong>"Alocar Trabalhador (Busca Direta)"</strong> no topo para pesquisar qualquer trabalhador do banco e vinculá-lo a um alojamento.</p>
                <button
                  onClick={() => setIsDirectModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
                >
                  <UserPlus size={15} />
                  Fazer Primeira Alocação
                </button>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Trabalhador</th>
                    <th className="px-4 py-3">Alojamento Vinculado</th>
                    <th className="px-4 py-3">Cama / Quarto</th>
                    <th className="px-4 py-3">Cliente & Obra</th>
                    <th className="px-4 py-3">Data Check-in</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações Operacionais</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredAlojados.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-blue-600 font-bold">{a.codigo_colab}</span>
                          <span className="font-black text-slate-900 dark:text-white">{a.worker_nome}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Home size={14} className="text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">{a.alojamento_nome}</span>
                            <span className="text-[10px] text-slate-400">{a.municipio}, {a.provincia}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                        {a.cama_identificador}
                      </td>

                      <td className="px-4 py-3.5">
                        <p className="font-bold text-slate-800 dark:text-slate-200">{a.cliente_nome}</p>
                        <p className="text-[10px] text-slate-400">{a.obra_nome}</p>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-300">
                        {a.data_checkin}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {a.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setCheckingOutWorker(a)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <LogOut size={13} />
                          Realizar Check-out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALOCAÇÃO DIRETA DE TRABALHADOR REAL (BUSCA NO BANCO)              */}
      {/* ========================================================================= */}
      {isDirectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Alocar Trabalhador no Alojamento</h2>
                  <p className="text-xs text-slate-500">Busca em tempo real entre os 800+ colaboradores reais cadastrados no banco</p>
                </div>
              </div>
              <button
                onClick={() => setIsDirectModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDirectAllocationSubmit} className="p-6 space-y-4 text-xs">
              {/* 1. Busca do Trabalhador */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Pesquisar Trabalhador (Nome ou Código E-XXXX):
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Digite para pesquisar (Ex: Carlos, Jefferson, E1407, E2054)..."
                    value={workerSearchQuery}
                    onChange={e => setWorkerSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                  {isSearchingWorkers && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {/* Lista de Resultados */}
                {searchResults.length > 0 && !selectedRealWorker && (
                  <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-2xl max-h-40 overflow-y-auto bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                    {searchResults.map(w => (
                      <div
                        key={w.id}
                        onClick={() => {
                          setSelectedRealWorker(w);
                          setSearchResults([]);
                        }}
                        className="p-2.5 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {w.Cod_colab || 'E-XXXX'}
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                            {w.Nombre}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {w.status_trabajador || 'Ativo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trabalhador Selecionado */}
                {selectedRealWorker && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <UserCheck size={18} className="text-blue-600" />
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-600 block">{selectedRealWorker.Cod_colab}</span>
                        <p className="font-black text-slate-900 dark:text-white text-xs">{selectedRealWorker.Nombre}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRealWorker(null);
                        setWorkerSearchQuery('');
                      }}
                      className="text-xs text-slate-400 hover:text-rose-600 font-bold px-2 py-1"
                    >
                      Trocar
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Seleção de Alojamento Real */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    2. Selecionar Alojamento:
                  </label>
                  <select
                    value={directAlojamentoId}
                    onChange={e => {
                      setDirectAlojamentoId(e.target.value);
                      setDirectCamaId('');
                    }}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="">Escolha um imóvel...</option>
                    {alojamentos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} - {a.nome} ({a.municipio || 'Espanha'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    3. Cama / Vaga Livre:
                  </label>
                  {directAlojamentoId ? (
                    directCamasFiltradas.length === 0 ? (
                      <div className="p-2 bg-amber-50 text-amber-800 text-[11px] rounded-lg">Sem vagas livres</div>
                    ) : (
                      <select
                        value={directCamaId}
                        onChange={e => setDirectCamaId(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      >
                        <option value="">Selecione uma cama...</option>
                        {directCamasFiltradas.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.identificador} ({c.tipo})
                          </option>
                        ))}
                      </select>
                    )
                  ) : (
                    <select disabled className="w-full px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs">
                      <option>Selecione o alojamento primeiro</option>
                    </select>
                  )}
                </div>
              </div>

              {/* 3. Cliente & Obra de Destino */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cliente do Contrato:
                  </label>
                  <input
                    type="text"
                    value={directCliente}
                    onChange={e => setDirectCliente(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Obra / Local de Trabalho:
                  </label>
                  <input
                    type="text"
                    value={directObra}
                    onChange={e => setDirectObra(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* 4. Datas de Check-in */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data Check-in (Início):
                  </label>
                  <input
                    type="date"
                    value={directDataInicio}
                    onChange={e => setDirectDataInicio(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Previsão Check-out (Opcional):
                  </label>
                  <input
                    type="date"
                    value={directDataFim}
                    onChange={e => setDirectDataFim(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Trabalhador alocado para obra de montagem industrial"
                  value={directObservacoes}
                  onChange={e => setDirectObservacoes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedRealWorker || !directCamaId || isAllocating}
                  className="px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isAllocating ? 'Alocando...' : 'Confirmar Alocação no Alojamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CHECK-OUT & LIBERAÇÃO DE VAGA                                    */}
      {/* ========================================================================= */}
      {checkingOutWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-2xl shadow-sm">
                  <LogOut size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Check-out de Trabalhador</h2>
                  <p className="text-xs text-slate-500">Desalocação do imóvel e liberação de vaga no inventário</p>
                </div>
              </div>
              <button
                onClick={() => setCheckingOutWorker(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Trabalhador:</p>
                <p className="font-black text-sm text-slate-900 dark:text-white">{checkingOutWorker.worker_nome} ({checkingOutWorker.codigo_colab})</p>
                <p className="text-slate-500 text-[11px]">Alojamento: <strong>{checkingOutWorker.alojamento_nome}</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo do Check-out / Baixa:
                </label>
                <select
                  value={motivoCheckout}
                  onChange={e => setMotivoCheckout(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="Término de Pedido / Fim de Obra">Término de Pedido / Fim de Obra</option>
                  <option value="Reemplazo / Substituição por outro colaborador">Reemplazo / Substituição por outro colaborador</option>
                  <option value="Baixa Operacional / Demissão">Baixa Operacional / Demissão</option>
                  <option value="Transferência para outro Alojamento">Transferência para outro Alojamento</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Data Efetiva de Saída:
                </label>
                <input
                  type="date"
                  value={dataSaidaEfetiva}
                  onChange={e => setDataSaidaEfetiva(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="vistoriaCheck"
                  checked={vistoriaOk}
                  onChange={e => setVistoriaOk(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="vistoriaCheck" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Chaves devolvidas e vistoria do quarto realizada sem pendências.
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center">
              <button
                onClick={() => setCheckingOutWorker(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCheckout}
                disabled={isProcessingCheckout}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm disabled:opacity-50"
              >
                {isProcessingCheckout ? 'Processando...' : 'Confirmar Check-out & Liberar Cama'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
