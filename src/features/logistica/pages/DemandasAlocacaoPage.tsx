import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  MapPin,
  CheckCircle,
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

  // Selección y Asignación vía Panel Lateral
  const [selectedDemanda, setSelectedDemanda] = useState<DemandaTrabalhador | null>(null);
  const [selectedAlojamentoId, setSelectedAlojamentoId] = useState<string>('');
  const [selectedCamaId, setSelectedCamaId] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState<string>('');
  const [observacoes, setObservacoes] = useState<string>('');
  const [isAllocating, setIsAllocating] = useState(false);

  // Modal Asignación Directa de Trabajador Real
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
  const [checkingOutWorker, setCheckingOutWorker] = useState<TrabalhadorAlojado | null>(null);
  const [motivoCheckout, setMotivoCheckout] = useState<string>('Fin de Pedido / Obra');
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
      console.error('Error al cargar datos de logística:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Búsqueda en tiempo real de trabajadores reales en la base de datos
  useEffect(() => {
    if (!isDirectModalOpen) return;
    const timer = setTimeout(async () => {
      setIsSearchingWorkers(true);
      try {
        const res = await logisticsService.searchTrabalhadores(workerSearchQuery);
        setSearchResults(res);
      } catch (e) {
        console.error('Error en la búsqueda de trabajadores:', e);
      } finally {
        setIsSearchingWorkers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [workerSearchQuery, isDirectModalOpen]);

  // Asignación desde la lista de Demandas
  const handleConfirmAllocation = async () => {
    if (!selectedDemanda || !selectedCamaId || !selectedAlojamentoId) {
      alert('Seleccione un trabajador, un alojamiento y una cama disponible.');
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

      alert(`¡Trabajador ${selectedDemanda.worker_nome} asignado con éxito!`);
      setSelectedDemanda(null);
      setSelectedCamaId('');
      setSelectedAlojamentoId('');
      setObservacoes('');
      loadData();
      setActiveTab('alojados');
    } catch (err: any) {
      console.error('Error al asignar:', err);
      alert('Error al realizar la asignación.');
    } finally {
      setIsAllocating(false);
    }
  };

  // Asignación Directa de Trabajador Real
  const handleDirectAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRealWorker || !directAlojamentoId || !directCamaId) {
      alert('Seleccione un trabajador, un alojamiento y una cama disponible.');
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
        cliente_nome: selectedRealWorker.contratante || 'Luminous',
        obra_nome: selectedRealWorker.ubicacion || 'Barcelona / España',
        data_inicio: directDataInicio,
        data_fim: directDataFim,
        observacoes: directObservacoes
      });

      alert(`✅ ¡Trabajador ${selectedRealWorker.Nombre} asignado con éxito al alojamiento!`);
      setIsDirectModalOpen(false);
      setSelectedRealWorker(null);
      setDirectAlojamentoId('');
      setDirectCamaId('');
      setWorkerSearchQuery('');
      loadData();
      setActiveTab('alojados');
    } catch (err) {
      console.error('Error al asignar trabajador real:', err);
      alert('Error al realizar la asignación.');
    } finally {
      setIsAllocating(false);
    }
  };

  // Check-out de Trabajador
  const handleConfirmCheckout = async () => {
    if (!checkingOutWorker) return;

    try {
      setIsProcessingCheckout(true);
      await logisticsService.checkoutTrabalhador(checkingOutWorker.alocacao_id, motivoCheckout);
      alert(`Check-out de ${checkingOutWorker.worker_nome} completado. ¡Cama liberada en el inventario!`);
      setCheckingOutWorker(null);
      loadData();
    } catch (err) {
      console.error('Error al realizar checkout:', err);
      alert('Error al realizar checkout.');
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleResetAlocacoes = async () => {
    if (confirm('¿Desea reiniciar todas las asignaciones para comenzar las pruebas desde cero?')) {
      await logisticsService.clearAllAlocacoes();
      alert('¡Asignaciones reiniciadas con éxito!');
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

  // Sugerencia Inteligente por Proximidad
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
                Central de Demandas & Ocupación de Alojamientos
              </h1>
              <p className="text-xs text-slate-500">
                Atención de pedidos y reemplazos, asignación directa de colaboradores y control de check-outs
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
            Asignar Trabajador (Búsqueda Directa)
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors shadow-xs"
            title="Actualizar"
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
          <span>Pendientes de Asignación (Pedidos & Reemplazos)</span>
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
          <span>Trabajadores Alojados & Check-outs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            {alojados.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: DEMANDAS & REEMPLAZOS PENDIENTES DE ASIGNACIÓN                      */}
      {/* ========================================================================= */}
      {activeTab === 'demandas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda (7 columnas): Lista de Demandas */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Buscar por trabajador, obra o ciudad..."
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
                    Nuevos Pedidos
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
                    Cargando demandas operativas...
                  </div>
                ) : filteredDemandas.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-3">
                    <CheckCircle size={32} className="mx-auto text-emerald-500" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">Ningún trabajador pendiente en esta lista</p>
                    <p className="text-xs">Para asignar cualquier colaborador activo de la empresa, use el botón <strong>"Asignar Trabajador (Búsqueda Directa)"</strong> en la parte superior.</p>
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
                              {d.tipo_solicitacao === 'Novo Pedido' ? 'Nuevo Pedido' : d.tipo_solicitacao}
                            </span>
                            {d.urgencia === 'Crítica' && (
                              <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                <AlertTriangle size={11} />
                                Urgente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Datos de la Obra y Ubicación */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Cliente & Obra</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                              {d.cliente_nome}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">{d.obra_nome}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Ciudad / Inicio</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                              <MapPin size={12} className="text-blue-500" />
                              {d.municipio}, {d.pais}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400" />
                              Inicio: {d.data_inicio}
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

          {/* Columna Derecha (5 columnas): Panel de Asignación & Sugerencia por Proximidad */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Bed className="text-blue-600" size={18} />
                  Asignar Trabajador
                </h2>
                {selectedDemanda && (
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
                    {selectedDemanda.codigo_colab}
                  </span>
                )}
              </div>

              {selectedDemanda ? (
                <div className="space-y-4 text-xs">
                  {/* Card del Trabajador Seleccionado */}
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-1">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Trabajador Seleccionado:</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{selectedDemanda.worker_nome}</p>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      Destino: <strong>{selectedDemanda.cliente_nome}</strong> ({selectedDemanda.municipio})
                    </p>
                  </div>

                  {/* 1. Selección de Alojamiento con Sugerencia por Proximidad */}
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      1. Alojamiento Sugerido (Proximidad):
                    </label>
                    <select
                      value={selectedAlojamentoId}
                      onChange={e => {
                        setSelectedAlojamentoId(e.target.value);
                        setSelectedCamaId('');
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                    >
                      <option value="">Seleccione un inmueble...</option>
                      {sortedAlojamentos.map(a => {
                        const isSameCity = (a.municipio || '').toLowerCase().includes(targetCity);
                        return (
                          <option key={a.id} value={a.id}>
                            {isSameCity ? '⭐ [Recomendado Próximo] ' : ''}
                            {a.codigo} - {a.nome} ({a.municipio || 'España'}) - Cap: {a.capacidade_pessoas} pax
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Selección de Cama / Habitación Disponible */}
                  {selectedAlojamentoId && (
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        2. Cama / Habitación Libre:
                      </label>
                      {camasFiltradas.length === 0 ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-[11px]">
                          ⚠️ Todas las camas de este inmueble están ocupadas. Seleccione otro alojamiento.
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
                                  Libre
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Fechas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        Fecha Check-in:
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
                        Previsión Salida:
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={e => setDataFim(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  {/* Botón de Confirmación */}
                  <button
                    type="button"
                    onClick={handleConfirmAllocation}
                    disabled={!selectedCamaId || isAllocating}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    {isAllocating ? 'Procesando Check-in...' : 'Confirmar Check-in & Asignación'}
                  </button>
                </div>
              ) : (
                <div className="p-10 text-center text-slate-400 text-xs space-y-3">
                  <Users size={28} className="mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">Ningún trabajador seleccionado</p>
                  <p>Seleccione un trabajador de la lista al lado para ver los alojamientos sugeridos con plazas libres, o pulse en <strong>"Asignar Trabajador (Búsqueda Directa)"</strong> en la parte superior.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: TRABAJADORES ALOJADOS & CHECK-OUTS (OCUPACIÓN ACTUAL)              */}
      {/* ========================================================================= */}
      {activeTab === 'alojados' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar trabajador alojado, inmueble o cliente..."
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
                  Reiniciar Asignaciones
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-16 text-center text-slate-500">Cargando ocupación actual...</div>
            ) : filteredAlojados.length === 0 ? (
              <div className="p-16 text-center text-slate-500 space-y-3">
                <Home size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p className="font-bold text-slate-700 dark:text-slate-300">Ningún trabajador alojado en este momento</p>
                <p className="text-xs text-slate-400">Haga clic en <strong>"Asignar Trabajador (Búsqueda Directa)"</strong> para buscar cualquier colaborador de la base de datos y vincularlo a un alojamiento.</p>
                <button
                  onClick={() => setIsDirectModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
                >
                  <UserPlus size={15} />
                  Realizar Primera Asignación
                </button>
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Trabajador</th>
                    <th className="px-4 py-3">Alojamiento Vinculado</th>
                    <th className="px-4 py-3">Cama / Habitación</th>
                    <th className="px-4 py-3">Empresa & Obra</th>
                    <th className="px-4 py-3">Fecha Check-in</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones Operativas</th>
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
                          {a.status === 'Ativo' ? 'Activo' : a.status}
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
      {/* MODAL: ASIGNACIÓN DIRECTA DE TRABAJADOR REAL (BÚSQUEDA EN BASE DE DATOS) */}
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
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Asignar Trabajador al Alojamiento</h2>
                  <p className="text-xs text-slate-500">Búsqueda en tiempo real entre los colaboradores activos de la base de datos</p>
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
              {/* 1. Búsqueda del Trabajador */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Buscar Trabajador (Nombre o Código E-XXXX):
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Escriba para buscar (Ej: Carlos, Jefferson, E1407, E2054)..."
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
                          {w.status_trabajador || 'Activo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trabajador Seleccionado con Vínculo Operativo Bloqueado */}
                {selectedRealWorker && (
                  <div className="mt-2 p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <UserCheck size={20} className="text-blue-600 flex-shrink-0" />
                        <div>
                          <span className="font-mono text-xs font-bold text-blue-600 block">{selectedRealWorker.Cod_colab}</span>
                          <p className="font-black text-slate-900 dark:text-white text-sm">{selectedRealWorker.Nombre}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRealWorker(null);
                          setWorkerSearchQuery('');
                        }}
                        className="text-xs text-slate-400 hover:text-rose-600 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Cambiar
                      </button>
                    </div>

                    {/* Vínculo Operativo Obligatorio e Inmutable */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-blue-100 dark:border-blue-900/40 text-[11px]">
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                          <Building size={11} className="text-blue-500" /> Empresa / Cliente
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {selectedRealWorker.contratante || 'Luminous'}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                          <MapPin size={11} className="text-emerald-500" /> Obra / Ubicación
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                          {selectedRealWorker.ubicacion || 'Barcelona / España'}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block flex items-center gap-1">
                          <CheckCircle2 size={11} className="text-purple-500" /> Estado del Ingreso
                        </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                          {selectedRealWorker.status_trabajador || 'Activo'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Selección de Alojamiento Real */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    2. Seleccionar Alojamiento:
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
                    <option value="">Elija un inmueble...</option>
                    {alojamentos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} - {a.nome} ({a.municipio || 'España'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    3. Cama / Plaza Libre:
                  </label>
                  {directAlojamentoId ? (
                    directCamasFiltradas.length === 0 ? (
                      <div className="p-2 bg-amber-50 text-amber-800 text-[11px] rounded-lg">Sin plazas libres</div>
                    ) : (
                      <select
                        value={directCamaId}
                        onChange={e => setDirectCamaId(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      >
                        <option value="">Seleccione una cama...</option>
                        {directCamasFiltradas.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.identificador} ({c.tipo})
                          </option>
                        ))}
                      </select>
                    )
                  ) : (
                    <select disabled className="w-full px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-xs">
                      <option>Seleccione el alojamiento primero</option>
                    </select>
                  )}
                </div>
              </div>

              {/* 4. Fechas de Check-in */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Check-in (Inicio):
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
                    Previsión Salida (Opcional):
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
                  Observaciones:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Colaborador asignado para obra de montaje industrial"
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
                  {isAllocating ? 'Asignando...' : 'Confirmar Asignación en el Alojamiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CHECK-OUT & LIBERACIÓN DE PLAZA                                  */}
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
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Check-out de Trabajador</h2>
                  <p className="text-xs text-slate-500">Desasignación del inmueble y liberación de plaza en inventario</p>
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
                <p className="text-[10px] font-bold text-slate-400 uppercase">Trabajador:</p>
                <p className="font-black text-sm text-slate-900 dark:text-white">{checkingOutWorker.worker_nome} ({checkingOutWorker.codigo_colab})</p>
                <p className="text-slate-500 text-[11px]">Alojamiento: <strong>{checkingOutWorker.alojamento_nome}</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motivo del Check-out / Baja:
                </label>
                <select
                  value={motivoCheckout}
                  onChange={e => setMotivoCheckout(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="Fin de Pedido / Obra">Fin de Pedido / Obra</option>
                  <option value="Reemplazo / Sustitución por otro colaborador">Reemplazo / Sustitución por otro colaborador</option>
                  <option value="Baja Operativa / Fin de Contrato">Baja Operativa / Fin de Contrato</option>
                  <option value="Traslado a otro Alojamiento">Traslado a otro Alojamiento</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fecha Efectiva de Salida:
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
                  Llaves devueltas e inspección de la habitación realizada sin incidencias.
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
                {isProcessingCheckout ? 'Procesando...' : 'Confirmar Check-out & Liberar Cama'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
