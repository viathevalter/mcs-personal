import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  Home,
  Building,
  Bed,
  CheckCircle2,
  AlertTriangle,
  X,
  Hotel,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  Users,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react';
import type { Alojamento, Cama, Alocacao } from '../services/logisticsService';

interface AlojamentoSearchSelectProps {
  alojamentos: Alojamento[];
  camasDisponiveis: Cama[];
  selectedAlojamentoId: string;
  onSelectAlojamento: (alojamentoId: string, isSpecial?: boolean | 'propio' | 'cliente') => void;
  selectedCamaId?: string;
  onSelectCama?: (camaId: string) => void;
  targetCity?: string;
  targetCliente?: string;
  alojados?: Alocacao[];
  requiredVagas?: number;
  allowPropio?: boolean;
  allowCliente?: boolean;
}

export const AlojamentoSearchSelect: React.FC<AlojamentoSearchSelectProps> = ({
  alojamentos,
  camasDisponiveis,
  selectedAlojamentoId,
  onSelectAlojamento,
  selectedCamaId,
  onSelectCama,
  targetCity = '',
  targetCliente = '',
  alojados = [],
  requiredVagas = 1,
  allowPropio = true,
  allowCliente = true
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('todas');
  const [categoryFilter, setCategoryFilter] = useState<
    'todos' | 'mismo_cliente' | 'cidade_obra' | 'libres' | 'booking_airbnb' | 'fijo' | 'recientes'
  >('todos');
  const [isChanging, setIsChanging] = useState(!selectedAlojamentoId);

  // Normalizador de texto para comparações
  const normalize = (s?: string) => (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // Lista única de cidades dos alojamentos
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    alojamentos.forEach(a => {
      if (a.municipio && a.municipio.trim()) {
        set.add(a.municipio.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [alojamentos]);

  // Contagem de camas livres por alojamento
  const camasCountByAlojamento = useMemo(() => {
    const map = new Map<string, number>();
    camasDisponiveis.forEach(c => {
      if (c.alojamento_id) {
        map.set(c.alojamento_id, (map.get(c.alojamento_id) || 0) + 1);
      }
    });
    return map;
  }, [camasDisponiveis]);

  // Mapa de residentes atualmente hospedados por alojamento
  const residentsByAlojamento = useMemo(() => {
    const map = new Map<string, Alocacao[]>();
    alojados
      .filter(a => a.status !== 'Checkout' && a.alojamento_id)
      .forEach(a => {
        const list = map.get(a.alojamento_id!) || [];
        list.push(a);
        map.set(a.alojamento_id!, list);
      });
    return map;
  }, [alojados]);

  // Alojamento atualmente selecionado
  const selectedAlojamento = useMemo(() => {
    if (!selectedAlojamentoId) return null;
    if (selectedAlojamentoId === 'propio') {
      return {
        id: 'propio',
        codigo: 'PROP-001',
        nome: 'Alojamiento Propio / Por Cuenta Propia',
        municipio: targetCity || 'Residencia Propia',
        endereco: 'Colaborador se hospeda por su cuenta (Ayuda de coste € 300 / mes)',
        tipo_alojamento: 'Propio',
        provedor: { nome_razao_social: 'Particular / Cuenta Propia' }
      } as unknown as Alojamento;
    }
    if (selectedAlojamentoId === 'cliente') {
      return {
        id: 'cliente',
        codigo: 'CLI-ALOJ',
        nome: `Alojamiento Cedido por el Cliente (${targetCliente || 'Cliente Obra'})`,
        municipio: targetCity || 'Ubicación de la Obra',
        endereco: 'El cliente de la obra proporciona el alojamiento (Sin coste directo para MCS)',
        tipo_alojamento: 'Cliente',
        provedor: { nome_razao_social: targetCliente || 'Cliente Obra' }
      } as unknown as Alojamento;
    }
    return alojamentos.find(a => a.id === selectedAlojamentoId) || null;
  }, [selectedAlojamentoId, alojamentos, targetCity, targetCliente]);

  // Camas disponíveis do alojamento selecionado
  const availableBedsForSelected = useMemo(() => {
    if (!selectedAlojamentoId || selectedAlojamentoId === 'propio' || selectedAlojamentoId === 'cliente') return [];
    return camasDisponiveis.filter(c => c.alojamento_id === selectedAlojamentoId);
  }, [selectedAlojamentoId, camasDisponiveis]);

  // Métricas rápidas de contagem para os filtros
  const metrics = useMemo(() => {
    const normCli = normalize(targetCliente);
    const normCity = normalize(targetCity);

    let countMismoCliente = 0;
    let countMismaCiudad = 0;
    let countConPlazas = 0;

    alojamentos.forEach(a => {
      const camas = camasCountByAlojamento.get(a.id) || 0;
      if (camas >= requiredVagas) countConPlazas++;

      if (normCity && normalize(a.municipio).includes(normCity)) {
        countMismaCiudad++;
      }

      if (normCli) {
        const residents = residentsByAlojamento.get(a.id) || [];
        const hasSameClient = residents.some(r => normalize(r.cliente_nome).includes(normCli));
        if (hasSameClient) countMismoCliente++;
      }
    });

    return { countMismoCliente, countMismaCiudad, countConPlazas };
  }, [alojamentos, targetCliente, targetCity, camasCountByAlojamento, residentsByAlojamento, requiredVagas]);

  // Filtragem e Ordenação Inteligente dos Alojamentos
  const filteredAlojamentos = useMemo(() => {
    const q = normalize(searchQuery);
    const cityTargetClean = normalize(targetCity);
    const clienteTargetClean = normalize(targetCliente);

    return alojamentos.filter(a => {
      const nome = normalize(a.nome);
      const codigo = normalize(a.codigo);
      const municipio = normalize(a.municipio);
      const provincia = normalize(a.provincia);
      const endereco = normalize(a.endereco);
      const tipo = normalize(a.tipo_alojamento);
      const provedorNome = normalize(a.provedor?.nome_razao_social);
      const camasLivres = camasCountByAlojamento.get(a.id) || 0;
      const residents = residentsByAlojamento.get(a.id) || [];
      const hasSameClient = clienteTargetClean ? residents.some(r => normalize(r.cliente_nome).includes(clienteTargetClean)) : false;

      // 1. Busca por Texto Livre (nome, código, rua, cidade, fornecedor, nome dos colegas hospedados)
      if (q) {
        const residentNames = residents.map(r => normalize(r.worker_nome)).join(' ');
        const matchesQ =
          nome.includes(q) ||
          codigo.includes(q) ||
          municipio.includes(q) ||
          provincia.includes(q) ||
          endereco.includes(q) ||
          tipo.includes(q) ||
          provedorNome.includes(q) ||
          residentNames.includes(q);

        if (!matchesQ) return false;
      }

      // 2. Filtro por Dropdown de Cidade
      if (selectedCityFilter !== 'todas' && a.municipio?.toLowerCase() !== selectedCityFilter.toLowerCase()) {
        return false;
      }

      // 3. Filtros de Categoria Rápida
      if (categoryFilter === 'mismo_cliente') {
        if (!hasSameClient) return false;
      } else if (categoryFilter === 'cidade_obra') {
        if (!cityTargetClean || !municipio.includes(cityTargetClean)) return false;
      } else if (categoryFilter === 'libres') {
        if (camasLivres < requiredVagas) return false;
      } else if (categoryFilter === 'fijo') {
        if (!tipo.includes('fijo') && !tipo.includes('empresa') && !tipo.includes('propio')) return false;
      } else if (categoryFilter === 'booking_airbnb') {
        const isBookingAirbnb =
          tipo.includes('temporal') ||
          tipo.includes('airbnb') ||
          tipo.includes('booking') ||
          tipo.includes('hotel') ||
          provedorNome.includes('booking') ||
          provedorNome.includes('airbnb');
        if (!isBookingAirbnb) return false;
      } else if (categoryFilter === 'recientes') {
        if (!a.created_at) return false;
        const createdDate = new Date(a.created_at).getTime();
        const now = new Date().getTime();
        const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 7) return false;
      }

      return true;
    }).sort((a, b) => {
      const camasA = camasCountByAlojamento.get(a.id) || 0;
      const camasB = camasCountByAlojamento.get(b.id) || 0;

      const hasVagasA = camasA >= requiredVagas;
      const hasVagasB = camasB >= requiredVagas;

      const resA = residentsByAlojamento.get(a.id) || [];
      const resB = residentsByAlojamento.get(b.id) || [];
      const sameClientA = clienteTargetClean ? resA.some(r => normalize(r.cliente_nome).includes(clienteTargetClean)) : false;
      const sameClientB = clienteTargetClean ? resB.some(r => normalize(r.cliente_nome).includes(clienteTargetClean)) : false;

      const sameCityA = cityTargetClean && normalize(a.municipio).includes(cityTargetClean);
      const sameCityB = cityTargetClean && normalize(b.municipio).includes(cityTargetClean);

      // Prioridade 1: Vagas Livres + Colegas do mesmo cliente já alojados
      if (hasVagasA && sameClientA && !(hasVagasB && sameClientB)) return -1;
      if (!(hasVagasA && sameClientA) && hasVagasB && sameClientB) return 1;

      // Prioridade 2: Vagas Livres + Mesma Cidade da Obra
      if (hasVagasA && sameCityA && !(hasVagasB && sameCityB)) return -1;
      if (!(hasVagasA && sameCityA) && hasVagasB && sameCityB) return 1;

      // Prioridade 3: Alojamentos com Vagas Livres suficientes
      if (hasVagasA && !hasVagasB) return -1;
      if (!hasVagasA && hasVagasB) return 1;

      // Prioridade 4: Quantidade de camas livres decrescente
      if (camasA !== camasB) return camasB - camasA;

      return (a.nome || '').localeCompare(b.nome || '', 'es', { sensitivity: 'base' });
    });
  }, [alojamentos, searchQuery, selectedCityFilter, categoryFilter, targetCity, targetCliente, camasCountByAlojamento, residentsByAlojamento, requiredVagas]);

  const handlePickAlojamento = (aloj: Alojamento) => {
    onSelectAlojamento(aloj.id, false);
    const beds = camasDisponiveis.filter(c => c.alojamento_id === aloj.id);
    if (beds.length > 0 && onSelectCama) {
      onSelectCama(beds[0].id);
    }
    setIsChanging(false);
  };

  const handlePickSpecial = (specialType: 'propio' | 'cliente') => {
    if (specialType === 'propio') {
      onSelectAlojamento('propio', 'propio');
      if (onSelectCama) onSelectCama('propio');
    } else if (specialType === 'cliente') {
      onSelectAlojamento('cliente', 'cliente');
      if (onSelectCama) onSelectCama('cliente');
    }
    setIsChanging(false);
  };

  return (
    <div className="space-y-4">
      {/* 1. SE JÁ HOUVER ALOJAMENTO SELECIONADO E NÃO ESTIVER EM MODO DE BUSCA */}
      {selectedAlojamento && !isChanging ? (
        <div className={`p-4 rounded-2xl border-2 space-y-3 shadow-xs animate-in fade-in duration-150 ${
          selectedAlojamento.id === 'cliente'
            ? 'border-amber-500/80 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-700'
            : selectedAlojamento.id === 'propio'
            ? 'border-purple-500/80 bg-purple-50/60 dark:bg-purple-950/30 dark:border-purple-700'
            : 'border-blue-500/80 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-700'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl text-white shadow-2xs flex-shrink-0 ${
                selectedAlojamento.id === 'cliente'
                  ? 'bg-amber-600'
                  : selectedAlojamento.id === 'propio'
                  ? 'bg-purple-600'
                  : 'bg-blue-600'
              }`}>
                {selectedAlojamento.id === 'cliente' ? (
                  <Hotel size={20} />
                ) : selectedAlojamento.id === 'propio' ? (
                  <Home size={20} />
                ) : (
                  <Building size={20} />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                    selectedAlojamento.id === 'cliente'
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                      : selectedAlojamento.id === 'propio'
                      ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200'
                      : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
                  }`}>
                    {selectedAlojamento.codigo || (selectedAlojamento.id === 'cliente' ? 'CLI-ALOJ' : selectedAlojamento.id === 'propio' ? 'PROP-001' : 'AL-XXXX')}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedAlojamento.id === 'cliente'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      : selectedAlojamento.id === 'propio'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                  }`}>
                    {selectedAlojamento.id === 'cliente' ? 'Por Cuenta del Cliente' : selectedAlojamento.tipo_alojamento || 'Fijo'}
                  </span>
                  {selectedAlojamento.id !== 'propio' && selectedAlojamento.id !== 'cliente' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {camasCountByAlojamento.get(selectedAlojamento.id) || 0} camas libres
                    </span>
                  )}
                </div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm mt-1">
                  {selectedAlojamento.nome}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-rose-500 flex-shrink-0" />
                  <span>{selectedAlojamento.endereco || ''} ({selectedAlojamento.municipio || 'España'})</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsChanging(true)}
              className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 transition-all shadow-2xs hover:shadow-xs flex items-center justify-center gap-1.5 self-start sm:self-center cursor-pointer"
            >
              <RotateCcw size={13} />
              Buscar / Cambiar Alojamiento
            </button>
          </div>

          {/* Seletor de Cama / Quarto do Alojamento Escolhido */}
          {onSelectCama && selectedAlojamento.id !== 'propio' && (
            <div className="pt-3 border-t border-blue-200/80 dark:border-blue-900/60 space-y-1.5">
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                🛏️ Seleccionar Cama / Habitación disponible:
              </label>

              {availableBedsForSelected.length === 0 ? (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>No hay camas individuales registradas libres en este inmueble.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {availableBedsForSelected.map(cama => {
                    const isBedSelected = selectedCamaId === cama.id;
                    return (
                      <button
                        key={cama.id}
                        type="button"
                        onClick={() => onSelectCama(cama.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between cursor-pointer ${
                          isBedSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Bed size={14} className={isBedSelected ? 'text-white' : 'text-blue-600'} />
                          <span className="truncate">{cama.identificador}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isBedSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {cama.tipo === 'dupla' ? 'Cama Doble' : 'Individual'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 2. MODO DE BUSCA E SELEÇÃO AVANÇADA DE ALOJAMIENTOS */
        <div className="space-y-3.5 p-4 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          
          <div className="flex items-center justify-between">
            <label className="font-black text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
              <Search size={15} className="text-blue-600" />
              Seleccione el Alojamiento para este trabajador:
            </label>
            {selectedAlojamento && (
              <button
                type="button"
                onClick={() => setIsChanging(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Volver al seleccionado
              </button>
            )}
          </div>

          {/* Campo de Busca Principal */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, calle, ciudad, proveedor, Booking, Airbnb o nombres de compañeros..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Barra de Filtros Rápidos (Chips Inteligentes) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setCategoryFilter('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'todos'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Todos ({alojamentos.length})
            </button>

            {targetCliente && metrics.countMismoCliente > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter('mismo_cliente')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'mismo_cliente'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
                }`}
              >
                <Users size={12} />
                🏢 Mismo Cliente: {targetCliente} ({metrics.countMismoCliente})
              </button>
            )}

            {targetCity && metrics.countMismaCiudad > 0 && (
              <button
                type="button"
                onClick={() => setCategoryFilter('cidade_obra')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  categoryFilter === 'cidade_obra'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                }`}
              >
                <Sparkles size={12} />
                📍 Misma Ciudad: {targetCity} ({metrics.countMismaCiudad})
              </button>
            )}

            <button
              type="button"
              onClick={() => setCategoryFilter('libres')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                categoryFilter === 'libres'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
              }`}
            >
              🟢 Con Plazas Libres ({metrics.countConPlazas})
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('booking_airbnb')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'booking_airbnb'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-50'
              }`}
            >
              🏨 Booking & Airbnb
            </button>

            <button
              type="button"
              onClick={() => setCategoryFilter('fijo')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'fijo'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              🏠 Inmuebles Fijos
            </button>

            {/* Dropdown de Cidade */}
            {availableCities.length > 0 && (
              <select
                value={selectedCityFilter}
                onChange={e => setSelectedCityFilter(e.target.value)}
                className="ml-auto px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[150px] truncate cursor-pointer"
              >
                <option value="todas">Ciudad: Todas</option>
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          {/* Opção em Destaque: Alojamento por Conta do Cliente */}
          {allowCliente && (
            <div
              onClick={() => handlePickSpecial('cliente')}
              className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-600 text-white shadow-2xs group-hover:scale-105 transition-transform">
                  <Hotel size={16} />
                </div>
                <div>
                  <h5 className="font-black text-amber-950 dark:text-amber-200 text-xs">
                    🤝 Alojamiento por Cuenta del Cliente {targetCliente ? `(${targetCliente})` : ''}
                  </h5>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    El cliente de la obra proporciona el alojamiento (Sin coste directo de alquiler para MCS).
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs shadow-2xs">
                Seleccionar
              </span>
            </div>
          )}

          {/* Opção em Destaque: Alojamento Próprio */}
          {allowPropio && (
            <div
              onClick={() => handlePickSpecial('propio')}
              className="p-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/80 dark:hover:bg-purple-900/40 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-600 text-white shadow-2xs group-hover:scale-105 transition-transform">
                  <Home size={16} />
                </div>
                <div>
                  <h5 className="font-black text-purple-950 dark:text-purple-200 text-xs">
                    🏠 Alojamiento Propio / Por Cuenta Propia
                  </h5>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300">
                    El colaborador reside por su cuenta (Ayuda de coste € 300,00 / mes - Sin plaza empresa).
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold text-xs shadow-2xs">
                Seleccionar
              </span>
            </div>
          )}

          {/* Lista Rolável de Resultados com Inteligência de Ocupação e Colegas */}
          <div className="space-y-2 max-h-72 sm:max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {filteredAlojamentos.length === 0 ? (
              <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-1">
                <Building size={24} className="mx-auto text-slate-400" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                  Ningún alojamiento coincide con los filtros
                </p>
                <p className="text-[11px] text-slate-400">
                  Pruebe limpiando la búsqueda o cambiando el filtro de categoría.
                </p>
              </div>
            ) : (
              filteredAlojamentos.map(aloj => {
                const camasLivres = camasCountByAlojamento.get(aloj.id) || 0;
                const hasEnough = camasLivres >= requiredVagas;
                const isSameCity = targetCity && normalize(aloj.municipio).includes(normalize(targetCity));
                const isBooking = (aloj.nome || '').toLowerCase().includes('booking') || (aloj.provedor?.nome_razao_social || '').toLowerCase().includes('booking');
                const isAirbnb = (aloj.nome || '').toLowerCase().includes('airbnb') || (aloj.provedor?.nome_razao_social || '').toLowerCase().includes('airbnb');
                
                const residents = residentsByAlojamento.get(aloj.id) || [];
                const sameClientResidents = targetCliente ? residents.filter(r => normalize(r.cliente_nome).includes(normalize(targetCliente))) : [];
                const hasSameClient = sameClientResidents.length > 0;

                return (
                  <div
                    key={aloj.id}
                    onClick={() => handlePickAlojamento(aloj, false)}
                    className={`p-3 bg-white dark:bg-slate-900 rounded-xl border transition-all space-y-2 shadow-2xs group cursor-pointer ${
                      hasSameClient && hasEnough
                        ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 hover:border-indigo-500 hover:bg-indigo-50/40'
                        : isSameCity && hasEnough
                        ? 'border-purple-300 dark:border-purple-800 bg-purple-50/20 hover:border-purple-500 hover:bg-purple-50/40'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {aloj.codigo || 'AL-XXXX'}
                          </span>

                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            isBooking
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : isAirbnb
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {isBooking ? 'Booking' : isAirbnb ? 'Airbnb' : (aloj.tipo_alojamento || 'Fijo')}
                          </span>

                          {hasSameClient && (
                            <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center gap-1">
                              <Users size={11} />
                              {sameClientResidents.length} de {targetCliente}
                            </span>
                          )}

                          {isSameCity && (
                            <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 flex items-center gap-0.5">
                              📍 Ciudad Obra
                            </span>
                          )}
                        </div>

                        <h5 className="font-black text-slate-900 dark:text-white text-xs group-hover:text-blue-600 transition-colors truncate">
                          {aloj.nome}
                        </h5>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                          <MapPin size={11} className="text-rose-500 flex-shrink-0" />
                          <span className="truncate">{aloj.endereco || ''} ({aloj.municipio || 'España'}{aloj.provincia ? `, ${aloj.provincia}` : ''})</span>
                        </p>

                        {/* Listagem Rápida de Colegas Hospedados */}
                        {residents.length > 0 && (
                          <div className="pt-1 flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300 flex-wrap">
                            <span className="font-bold text-slate-400">Hospedados ({residents.length}):</span>
                            {residents.slice(0, 3).map((r, i) => (
                              <span
                                key={r.id || i}
                                className={`px-1.5 py-0.2 rounded font-medium ${
                                  targetCliente && normalize(r.cliente_nome).includes(normalize(targetCliente))
                                    ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {r.worker_nome.split(' ').slice(0, 2).join(' ')}
                              </span>
                            ))}
                            {residents.length > 3 && (
                              <span className="text-slate-400 font-bold">+{residents.length - 3} más</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0 space-y-1.5">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block shadow-2xs ${
                          hasEnough
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : camasLivres > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {camasLivres > 0 ? `🟢 ${camasLivres} libres` : '🔴 Completo'}
                        </span>

                        <div className="pt-1">
                          <button
                            type="button"
                            className="px-2.5 py-1 bg-blue-600 group-hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold shadow-2xs flex items-center gap-1 ml-auto"
                          >
                            Seleccionar
                            <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>💡 Sugerencias ordenadas por cliente, cercanía y camas libres</span>
            <span>Mostrando <strong>{filteredAlojamentos.length}</strong> alojamientos</span>
          </div>

        </div>
      )}
    </div>
  );
};
