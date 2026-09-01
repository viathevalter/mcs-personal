import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Building,
  Building2,
  Home,
  CreditCard,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  Eye,
  Pencil,
  Phone,
  Sparkles,
  Users,
  CheckSquare,
  Square,
  Zap,
  Filter,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Layers,
  PieChart,
  UserCheck,
  BedDouble,
  X
} from 'lucide-react';
import { contratosLogisticsService } from '../../services/contratosLogisticsService';
import type { ContratoAlojamento, OcupanteContrato } from '../../services/contratosLogisticsService';
import { financeLogisticsService } from '../../services/financeLogisticsService';

export const ContratosList: React.FC = () => {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState<ContratoAlojamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros principais (Padrão: Apenas ativos em curso)
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'fijos' | 'habitacion' | 'temporais' | 'com_fianca' | 'cerrados' | 'todos'>('ativos');
  const [vencimentoRange, setVencimentoRange] = useState<'todos' | '1-5' | '6-10' | '11-20' | '21-31'>('todos');
  
  // Seleção múltipla para geração de OP em lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [competenciaLote, setCompetenciaLote] = useState<string>('09/2026');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);

  // Galeria alinhada / Accordion de ocupantes expandidos
  const [expandedContractIds, setExpandedContractIds] = useState<Set<string>>(new Set());
  
  const [generatingOpId, setGeneratingOpId] = useState<string | null>(null);
  const [copiedIban, setCopiedIban] = useState<string | null>(null);
  const [viewingContrato, setViewingContrato] = useState<ContratoAlojamento | null>(null);

  const loadContratos = async () => {
    setIsLoading(true);
    try {
      const data = await contratosLogisticsService.fetchContratos();
      setContratos(data);
    } catch (err) {
      console.error('Error al cargar contratos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContratos();
  }, []);

  const handleCopyIban = (iban: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = new Set(expandedContractIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedContractIds(next);
  };

  const expandAllVisible = () => {
    if (expandedContractIds.size === filtered.length) {
      setExpandedContractIds(new Set());
    } else {
      setExpandedContractIds(new Set(filtered.map(c => c.id)));
    }
  };

  // Gerar OP Individual
  const handleGerarOP = async (contrato: ContratoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setGeneratingOpId(contrato.id);

      const dia = String(contrato.dia_vencimento || 5).padStart(2, '0');
      const vencimento = `2026-09-${dia}`;

      const opCriada = await financeLogisticsService.gerarOrdemPagamento({
        contrato_id: contrato.codigo,
        alojamento_id: contrato.alojamento_id,
        alojamento_nome: contrato.alojamento_nome,
        alojamento_codigo: contrato.alojamento?.codigo,
        provedor_id: contrato.provedor_id,
        provedor_nome: contrato.provedor_nome,
        iban_cobranca: contrato.iban_cobranca,
        banco: contrato.banco,
        titular: contrato.titular,
        centro_custo_cliente: contrato.cliente_nome || 'Centro de Coste General',
        centro_custo_obra: contrato.centro_custo_obra || `Obra ${contrato.alojamento?.municipio || 'Principal'}`,
        tipo_pago: 'Aluguel',
        valor: Number(contrato.valor_mensal) || 0,
        data_vencimento: vencimento,
        periodo_competencia: competenciaLote,
        observacoes: `Alquiler mensual del contrato ${contrato.codigo} (${contrato.alojamento_nome}) - ${contrato.tipo_contrato} - ${contrato.total_ocupantes || 0} ocupantes`
      });

      alert(`✅ ¡Orden de Pago ${opCriada.codigo_pago} generada con éxito para el inmueble ${contrato.alojamento_nome} (Cliente: ${contrato.cliente_nome || 'General'})!\nPuede visualizarla y aprobarla en Finanzas.`);
    } catch (err: any) {
      console.error('Error al generar OP:', err);
      alert(`Aviso: ${err?.message || 'No fue posible generar la Orden de Pago. Compruebe los datos del contrato.'}`);
    } finally {
      setGeneratingOpId(null);
    }
  };

  // Gerar OPs em Lote para os contratos selecionados
  const handleGerarOPsEmLote = async () => {
    const selecionados = contratos.filter(c => selectedIds.has(c.id));
    if (selecionados.length === 0) return;

    const confirmMsg = `¿Desea generar ${selecionados.length} Órdenes de Pago para la competencia ${competenciaLote} por un importe total de € ${selecionados.reduce((acc, c) => acc + (Number(c.valor_mensal) || 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsGeneratingBatch(true);

      const payloads = selecionados.map(contrato => {
        const dia = String(contrato.dia_vencimento || 5).padStart(2, '0');
        const vencimento = `2026-09-${dia}`;
        return {
          contrato_id: contrato.codigo,
          alojamento_id: contrato.alojamento_id,
          alojamento_nome: contrato.alojamento_nome,
          alojamento_codigo: contrato.alojamento?.codigo,
          provedor_id: contrato.provedor_id,
          provedor_nome: contrato.provedor_nome,
          iban_cobranca: contrato.iban_cobranca,
          banco: contrato.banco,
          titular: contrato.titular,
          centro_custo_cliente: contrato.cliente_nome || 'Centro de Coste General',
          centro_custo_obra: contrato.centro_custo_obra || `Obra ${contrato.alojamento?.municipio || 'Principal'}`,
          tipo_pago: 'Aluguel' as const,
          valor: Number(contrato.valor_mensal) || 0,
          data_vencimento: vencimento,
          periodo_competencia: competenciaLote,
          observacoes: `Alquiler mensual lote ${competenciaLote} - ${contrato.alojamento_nome}`
        };
      });

      const ops = await financeLogisticsService.gerarOrdensPagamentoEmLote(payloads);
      
      alert(`🎉 ¡Se generaron con éxito ${ops.length} Órdenes de Pago en Finanzas!`);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error('Error al generar OPs en lote:', err);
      alert(`Error al generar lote: ${err?.message || 'Compruebe la conexión.'}`);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Contagens e Métricas
  const totalContratos = contratos.length;
  const contratosAtivosList = useMemo(() => contratos.filter(c => c.status === 'Activo'), [contratos]);
  const contratosAtivos = contratosAtivosList.length;
  
  const fijosAtivos = useMemo(() => contratosAtivosList.filter(c => c.tipo_contrato === 'Fijo'), [contratosAtivosList]);
  const habitacionAtivos = useMemo(() => contratosAtivosList.filter(c => c.tipo_contrato === 'Por Trabajador / Habitación'), [contratosAtivosList]);
  const temporaisAtivos = useMemo(() => contratosAtivosList.filter(c => c.tipo_contrato?.includes('Temporario') || c.tipo_contrato?.includes('Temporal')), [contratosAtivosList]);
  
  const valorTotalMensalActivo = useMemo(() => 
    contratosAtivosList.reduce((acc, c) => acc + (Number(c.valor_mensal) || 0), 0),
    [contratosAtivosList]
  );

  const totalFiancasCustodia = useMemo(() => 
    contratosAtivosList.reduce((acc, c) => acc + (Number(c.fianza_valor) || 0), 0),
    [contratosAtivosList]
  );

  // Vencimentos Início de Mês (Días 1 a 5)
  const inicioMesContratos = useMemo(() => 
    contratosAtivosList.filter(c => Number(c.dia_vencimento || 5) <= 5),
    [contratosAtivosList]
  );
  const valorInicioMes = useMemo(() => 
    inicioMesContratos.reduce((acc, c) => acc + (Number(c.valor_mensal) || 0), 0),
    [inicioMesContratos]
  );

  // Filtragem dos Contratos
  const filtered = useMemo(() => {
    return contratos.filter(c => {
      // 1. Filtro de Texto
      const matchesSearch =
        (c.codigo && c.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.alojamento_nome && c.alojamento_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.provedor_nome && c.provedor_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cliente_nome && c.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.empresa_contratante && c.empresa_contratante.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.ocupantes_nomes && c.ocupantes_nomes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.ocupantes_detalhados && c.ocupantes_detalhados.some(o => 
          o.worker_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.codigo_colab?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          o.perfil?.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        (c.iban_cobranca && c.iban_cobranca.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Filtro de Status / Modalidade
      if (statusFilter === 'ativos') {
        if (c.status !== 'Activo') return false;
      } else if (statusFilter === 'fijos') {
        if (c.status !== 'Activo' || c.tipo_contrato !== 'Fijo') return false;
      } else if (statusFilter === 'habitacion') {
        if (c.status !== 'Activo' || c.tipo_contrato !== 'Por Trabajador / Habitación') return false;
      } else if (statusFilter === 'temporais') {
        if (c.status !== 'Activo' || (!c.tipo_contrato?.includes('Temporario') && !c.tipo_contrato?.includes('Temporal'))) return false;
      } else if (statusFilter === 'com_fianca') {
        if (c.status !== 'Activo' || Number(c.fianza_valor) <= 0) return false;
      } else if (statusFilter === 'cerrados') {
        if (c.status === 'Activo') return false;
      }

      // 3. Filtro por Faixa de Vencimento
      const dia = Number(c.dia_vencimento || 5);
      if (vencimentoRange === '1-5' && (dia < 1 || dia > 5)) return false;
      if (vencimentoRange === '6-10' && (dia < 6 || dia > 10)) return false;
      if (vencimentoRange === '11-20' && (dia < 11 || dia > 20)) return false;
      if (vencimentoRange === '21-31' && dia < 21) return false;

      return true;
    });
  }, [contratos, searchTerm, statusFilter, vencimentoRange]);

  // Gestão de Seleção
  const isAllSelected = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const toggleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const totalValorSelecionados = useMemo(() => {
    return contratos
      .filter(c => selectedIds.has(c.id))
      .reduce((acc, c) => acc + (Number(c.valor_mensal) || 0), 0);
  }, [contratos, selectedIds]);

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Contratos de Arrendamiento & Fianzas
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                  {contratosAtivos} Activos en Curso
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gestión unificada de alquileres (Fijos, Por Habitación & Temporal Hotel/Airbnb), imputación de costes y generación masiva de OPs
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/logistica/ordens-pagamento')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            <DollarSign size={15} />
            Ver Órdenes de Pago
          </button>
          <button
            onClick={() => navigate('/logistica/registros/alojamentos/novo')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nuevo Alojamiento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contratos em Curso */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Contratos en Curso</span>
            <Building size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {contratosAtivos} <span className="text-xs font-semibold text-slate-400">/ {totalContratos} total</span>
          </p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-blue-600 font-bold">{fijosAtivos.length} Fijos</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-600 font-bold">{habitacionAtivos.length} Habitación</span>
            <span className="text-slate-300">•</span>
            <span className="text-purple-600 font-bold">{temporaisAtivos.length} Hotel/Airbnb</span>
          </div>
        </div>

        {/* Custo Total Mensal Ativo */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Coste Mensual Activo</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            € {valorTotalMensalActivo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Media de € {contratosAtivos > 0 ? (valorTotalMensalActivo / contratosAtivos).toFixed(0) : 0}/inmueble/mes
          </span>
        </div>

        {/* Vencimento Início de Mês (Días 1 a 5) */}
        <div 
          onClick={() => { setStatusFilter('ativos'); setVencimentoRange('1-5'); }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 rounded-2xl space-y-1 shadow-xs cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="group-hover:text-amber-600 transition-colors">Vencimientos Días 1 al 5</span>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {inicioMesContratos.length} <span className="text-xs font-normal text-slate-400">inmuebles</span>
          </p>
          <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold block">
            € {valorInicioMes.toLocaleString('es-ES', { minimumFractionDigits: 2 })} a renovar ahora ⚡
          </span>
        </div>

        {/* Fianças em Custódia */}
        <div 
          onClick={() => { setStatusFilter('com_fianca'); setVencimentoRange('todos'); }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 rounded-2xl space-y-1 shadow-xs cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="group-hover:text-purple-600 transition-colors">Fianzas en Custodia</span>
            <ShieldCheck size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            € {totalFiancasCustodia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Depósitos activos en arrendamientos
          </span>
        </div>
      </div>

      {/* BARRA DE AÇÃO EM LOTE FLUTUANTE / FIXA */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-40 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-xl font-black">
              <Zap size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">
                {selectedIds.size} {selectedIds.size === 1 ? 'contrato seleccionado' : 'contratos seleccionados'}
              </p>
              <p className="text-xs text-slate-300">
                Total mensual a generar en Órdenes de Pago: <strong className="text-emerald-400 text-sm">€ {totalValorSelecionados.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 font-semibold">Competencia:</span>
              <input
                type="text"
                value={competenciaLote}
                onChange={e => setCompetenciaLote(e.target.value)}
                className="w-20 bg-slate-900 px-2 py-0.5 rounded text-white font-mono text-center font-bold"
                placeholder="09/2026"
              />
            </div>

            <button
              onClick={handleGerarOPsEmLote}
              disabled={isGeneratingBatch}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Zap size={14} />
              {isGeneratingBatch ? 'Generando Lote...' : `Generar ${selectedIds.size} Órdenes de Pago`}
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Cancelar selección"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filters and Search Bar */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por código, dirección, cliente, empresa, ocupante o IBAN..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ativos')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === 'ativos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              <span>En Curso ({contratosAtivos})</span>
            </button>

            <button
              onClick={() => setStatusFilter('fijos')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'fijos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              Fijos ({fijosAtivos.length})
            </button>

            <button
              onClick={() => setStatusFilter('habitacion')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'habitacion'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              Por Habitación ({habitacionAtivos.length})
            </button>

            <button
              onClick={() => setStatusFilter('temporais')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'temporais'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              Temporal Hotel/Airbnb ({temporaisAtivos.length})
            </button>

            <button
              onClick={() => setStatusFilter('com_fianca')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'com_fianca'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              Con Fianza ({contratosAtivosList.filter(c => Number(c.fianza_valor) > 0).length})
            </button>

            <button
              onClick={() => setStatusFilter('cerrados')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'cerrados'
                  ? 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Histórico ({contratos.filter(c => c.status !== 'Activo').length})
            </button>

            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'todos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              Todos ({totalContratos})
            </button>
          </div>
        </div>

        {/* Sub-barra de Filtro de Vencimentos & Botão de Expandir Todos */}
        <div className="px-4 py-2.5 bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar size={13} />
              Filtrar por Día de Vencimiento / Pago:
            </span>
            <div className="flex items-center gap-1">
              {[
                { id: 'todos', label: 'Todos los Días' },
                { id: '1-5', label: '⚡ Días 1 a 5 (Inicio de Mes)' },
                { id: '6-10', label: 'Días 6 a 10' },
                { id: '11-20', label: 'Días 11 a 20' },
                { id: '21-31', label: 'Días 21 a 31' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setVencimentoRange(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    vencimentoRange === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={expandAllVisible}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <Layers size={13} />
              {expandedContractIds.size === filtered.length ? 'Contraer Todos los Ocupantes' : 'Expandir Todos los Ocupantes'}
            </button>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] text-slate-500">
              Mostrando <strong>{filtered.length}</strong> de {contratos.length} contratos
            </span>
          </div>
        </div>

        {/* Table with Expandable Aligned Occupants Gallery */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              Cargando contratos de alojamientos y ocupantes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Ningún contrato encontrado con los filtros seleccionados</p>
              <p className="text-xs text-slate-400">Pruebe a cambiar el rango de vencimiento o el estado del contrato.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                      title={isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos los visibles'}
                    >
                      {isAllSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="w-8 py-3 px-1 text-center"></th>
                  <th className="px-3 py-3">Contrato & Inmueble</th>
                  <th className="px-3 py-3">Ocupación & Plazas</th>
                  <th className="px-3 py-3">Proveedor & Pago</th>
                  <th className="px-3 py-3">Modalidad</th>
                  <th className="px-3 py-3">Día Vencimiento</th>
                  <th className="px-3 py-3">Alquiler Mensual</th>
                  <th className="px-3 py-3">Fianza</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map(c => {
                  const isSelected = selectedIds.has(c.id);
                  const isExpanded = expandedContractIds.has(c.id);
                  const dia = Number(c.dia_vencimento || 5);
                  const isInicioMes = dia <= 5;
                  const ocupantes = c.ocupantes_detalhados || [];

                  return (
                    <React.Fragment key={c.id}>
                      <tr
                        onClick={e => toggleExpand(c.id, e)}
                        className={`transition-colors cursor-pointer group select-none ${
                          isSelected 
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/60' 
                            : isExpanded
                            ? 'bg-slate-50 dark:bg-slate-800/60'
                            : 'hover:bg-blue-50/30 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Checkbox de Seleção */}
                        <td className="px-3 py-3.5 text-center" onClick={e => toggleSelectOne(c.id, e)}>
                          <button className="text-slate-400 hover:text-blue-600 transition-colors">
                            {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                          </button>
                        </td>

                        {/* Chevron Expand/Collapse */}
                        <td className="py-3.5 px-1 text-center">
                          <button 
                            onClick={e => toggleExpand(c.id, e)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-transform"
                            title={isExpanded ? 'Ocultar ocupantes' : 'Ver detalle de ocupantes'}
                          >
                            <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                          </button>
                        </td>

                        {/* Código e Alojamento */}
                        <td className="px-3 py-3.5">
                          <div className="flex items-start gap-2.5">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:scale-105 transition-transform mt-0.5">
                              <Home size={15} />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                                  {c.codigo}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-semibold">
                                  {c.alojamento?.codigo || 'AL-XXXX'}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 max-w-[240px] truncate" title={c.alojamento_nome}>
                                {c.alojamento_nome}
                              </p>
                              
                              {/* Badges de Cliente e Empresa Contratante */}
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {c.cliente_nome && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 truncate max-w-[130px]" title={c.cliente_nome}>
                                    🏢 {c.cliente_nome}
                                  </span>
                                )}
                                {c.empresa_contratante && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 truncate max-w-[110px]" title={c.empresa_contratante}>
                                    {c.empresa_contratante}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Ocupação & Plazas */}
                        <td className="px-3 py-3.5">
                          {c.total_ocupantes !== undefined && c.total_ocupantes > 0 ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <Users size={11} />
                                {c.total_ocupantes} {c.total_ocupantes === 1 ? 'ocupante' : 'ocupantes'}
                              </span>
                              <p className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-medium">
                                <span>Ver colaboradores</span>
                                <ChevronRight size={10} />
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Sin ocupantes</span>
                          )}
                        </td>

                        {/* Provedor & IBAN */}
                        <td className="px-3 py-3.5">
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate max-w-[140px]">{c.provedor_nome}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {c.iban_cobranca ? (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] text-slate-500">
                                  {c.iban_cobranca.slice(0, 8)}...{c.iban_cobranca.slice(-4)}
                                </span>
                                <button
                                  onClick={e => handleCopyIban(c.iban_cobranca!, e)}
                                  className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded"
                                  title="Copiar IBAN"
                                >
                                  {copiedIban === c.iban_cobranca ? '✓' : 'Copiar'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sin IBAN</span>
                            )}
                          </div>
                        </td>

                        {/* Modalidade */}
                        <td className="px-3 py-3.5">
                          {c.tipo_contrato === 'Por Trabajador / Habitación' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                              <BedDouble size={11} />
                              Por Habitación
                            </span>
                          ) : c.tipo_contrato?.includes('Temporario') || c.tipo_contrato?.includes('Temporal') ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              🏨 Temporal (Hotel/Airbnb)
                            </span>
                          ) : c.tipo_contrato === 'Cliente' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              🏢 Aloj. Cliente
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              🏠 Fijo (Piso Completo)
                            </span>
                          )}
                        </td>

                        {/* Vencimento / Fecha Pago */}
                        <td className="px-3 py-3.5">
                          <div className="space-y-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black ${
                              isInicioMes
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              <Calendar size={11} />
                              Día {dia}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-medium">
                              {isInicioMes ? 'Inicio de mes' : 'Mensual'}
                            </span>
                          </div>
                        </td>

                        {/* Valor Mensal */}
                        <td className="px-3 py-3.5">
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            € {c.valor_mensal?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Fiança */}
                        <td className="px-3 py-3.5">
                          {c.fianza_valor > 0 ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-amber-700 dark:text-amber-400">
                                € {c.fianza_valor?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[9px] text-slate-400 block font-medium">
                                {c.fianza_meses} mes(es)
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Sin fianza</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'Activo'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {c.status}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={e => handleGerarOP(c, e)}
                              disabled={generatingOpId === c.id}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                              title="Generar Orden de Pago en Finanzas"
                            >
                              <DollarSign size={13} />
                              {generatingOpId === c.id ? 'Generando...' : 'Generar OP'}
                            </button>

                            <button
                              onClick={() => setViewingContrato(c)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Ver Ficha Completa del Contrato"
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              onClick={() => navigate(`/logistica/registros/alojamentos/editar/${c.alojamento_id}`)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Editar Alojamiento"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ACCORDION DRAWER: GALERIA ALINHADA DE OCUPANTES & RATEIO DE CUSTO */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-900/90 border-y border-slate-200 dark:border-slate-800">
                          <td colSpan={11} className="p-4 sm:p-5">
                            <div className="space-y-3 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-top-1 duration-150">
                              {/* Sub-header com Rateio e Resumo do Contrato */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg">
                                    <Users size={16} />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                                      <span>Ocupantes Asignados al Inmueble</span>
                                      <span className="text-[11px] font-black px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                        {ocupantes.length} trabajadores
                                      </span>
                                      {c.tipo_contrato === 'Por Trabajador / Habitación' && (
                                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                                          🛏️ Modalidad Por Habitación
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                      Desglose individual de colaboradores, perfil profesional e imputación mensual de coste
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Alquiler Total:</span>
                                    <strong className="text-slate-800 dark:text-slate-200">
                                      € {c.valor_mensal?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                    </strong>
                                  </div>

                                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2">
                                    <PieChart size={13} />
                                    <span className="text-[10px] font-bold uppercase">
                                      {c.tipo_contrato === 'Por Trabajador / Habitación' ? 'Media / Trabajador:' : 'Rateo por Trabajador:'}
                                    </span>
                                    <strong className="text-sm font-black">
                                      € {(c.custo_rateado_por_pessoa || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} <span className="text-[10px] font-normal">/ mes</span>
                                    </strong>
                                  </div>
                                </div>
                              </div>

                              {/* Tabela de Ocupantes */}
                              {ocupantes.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 text-xs italic bg-slate-50/50 dark:bg-slate-900/50 rounded-xl">
                                  Este inmueble no posee trabajadores asignados en este momento. Plazas disponibles para asignación en el módulo de Demandas.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/80 uppercase font-bold text-[9px] text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                      <tr>
                                        <th className="px-3 py-2">Cod.</th>
                                        <th className="px-3 py-2">Trabajador</th>
                                        <th className="px-3 py-2">Perfil / Función</th>
                                        <th className="px-3 py-2">Empresa Contratante</th>
                                        <th className="px-3 py-2">Cliente & Proyecto</th>
                                        <th className="px-3 py-2">Ubicación / Obra</th>
                                        <th className="px-3 py-2 text-right">Coste Imputado (Persona / Rateo)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                      {ocupantes.map((o, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                          {/* Código Colaborador */}
                                          <td className="px-3 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 text-[11px]">
                                            {o.codigo_colab || 'E-XXXX'}
                                          </td>

                                          {/* Nome do Trabalhador */}
                                          <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold text-[10px] flex items-center justify-center">
                                                {o.worker_nome?.slice(0, 2).toUpperCase()}
                                              </div>
                                              <div>
                                                <p className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                                  {o.worker_nome}
                                                </p>
                                                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-semibold">
                                                  <UserCheck size={9} />
                                                  Activo en obra
                                                </span>
                                              </div>
                                            </div>
                                          </td>

                                          {/* Perfil / Função */}
                                          <td className="px-3 py-2.5">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                              <Briefcase size={10} />
                                              {o.perfil || 'Montador / Operario'}
                                            </span>
                                          </td>

                                          {/* Empresa Contratante */}
                                          <td className="px-3 py-2.5">
                                            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[170px]">
                                              {o.empresa_contratante}
                                            </span>
                                          </td>

                                          {/* Cliente do Projeto */}
                                          <td className="px-3 py-2.5">
                                            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 block truncate max-w-[170px]">
                                              🏢 {o.cliente_nome}
                                            </span>
                                          </td>

                                          {/* Ubicación / Obra */}
                                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-[11px]">
                                            {o.obra_nome}
                                          </td>

                                          {/* Custo Rateado */}
                                          <td className="px-3 py-2.5 text-right">
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                                              € {o.custo_rateado?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-semibold">
                                              {c.tipo_contrato === 'Por Trabajador / Habitación' ? 'Coste plaza/mes' : 'Rateio mensual'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES DO CONTRATO */}
      {viewingContrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">{viewingContrato.codigo}</h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      viewingContrato.status === 'Activo'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {viewingContrato.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{viewingContrato.alojamento_nome}</p>
                </div>
              </div>

              <button
                onClick={() => setViewingContrato(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Modalidad</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{viewingContrato.tipo_contrato}</span>
                </div>
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60">
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase block">Día de Pago</span>
                  <span className="font-black text-amber-700 dark:text-amber-300 text-base">
                    Día {viewingContrato.dia_vencimento}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Alquiler Mensual</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-base">
                    € {viewingContrato.valor_mensal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Centro de Coste & Ocupação */}
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={14} />
                  Centro de Coste & Ocupación Actual
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <p><span className="text-slate-400">Cliente / Proyecto:</span> <strong className="text-blue-900 dark:text-blue-200">{viewingContrato.cliente_nome || 'Centro de Coste General'}</strong></p>
                  <p><span className="text-slate-400">Empresa Contratante:</span> <strong>{viewingContrato.empresa_contratante || 'LUMINOUS'}</strong></p>
                  <p><span className="text-slate-400">Ubicación / Obra:</span> <strong>{viewingContrato.centro_custo_obra}</strong></p>
                  <p><span className="text-slate-400">Total Ocupantes:</span> <strong>{viewingContrato.total_ocupantes || 0} personas</strong></p>
                </div>
                {viewingContrato.ocupantes_nomes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Colaboradores Alojados:</span> {viewingContrato.ocupantes_nomes}
                  </p>
                )}
              </div>

              {/* Fiança */}
              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Garantía / Fianza Registrada
                </span>
                <p className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  {viewingContrato.fianza_valor > 0
                    ? `€ ${viewingContrato.fianza_valor.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${viewingContrato.fianza_meses} meses)`
                    : 'Sin exigencia de fianza'}
                </p>
              </div>

              {/* Dados Bancários */}
              <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={14} />
                  Datos Bancarios para Pago del Alquiler
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <p><span className="text-slate-400">Proveedor:</span> <strong>{viewingContrato.provedor_nome}</strong></p>
                  <p><span className="text-slate-400">Método:</span> <strong>{viewingContrato.metodo_pago}</strong></p>
                  <p><span className="text-slate-400">Banco:</span> <strong>{viewingContrato.banco || '-'}</strong></p>
                  <p><span className="text-slate-400">Titular:</span> <strong>{viewingContrato.titular || '-'}</strong></p>
                </div>
                {viewingContrato.iban_cobranca && (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">IBAN Oficial</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{viewingContrato.iban_cobranca}</span>
                    </div>
                    <button
                      onClick={() => handleCopyIban(viewingContrato.iban_cobranca!)}
                      className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 font-bold rounded-lg hover:opacity-80"
                    >
                      {copiedIban === viewingContrato.iban_cobranca ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center">
              <button
                onClick={() => setViewingContrato(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cerrar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleGerarOP(viewingContrato);
                    setViewingContrato(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <DollarSign size={14} />
                  Generar Orden de Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
