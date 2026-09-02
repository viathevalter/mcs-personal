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
  ShieldAlert,
  DownloadCloud,
  FileCheck,
  Check,
  Save,
  X
} from 'lucide-react';
import { contratosLogisticsService } from '../../services/contratosLogisticsService';
import type { ContratoAlojamento, OcupanteContrato, FianzaDetalhes } from '../../services/contratosLogisticsService';
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

  // Modal de Vistoria e Liquidação de Fiança
  const [fianzaModalContrato, setFianzaModalContrato] = useState<ContratoAlojamento | null>(null);
  const [fianzaForm, setFianzaForm] = useState<FianzaDetalhes>({
    fianza_valor: 0,
    estado_fianza: 'En Custodia',
    recaudo_devuelto: 0,
    deducoes_danos: 0,
    deducoes_suministros: 0,
    documentos_url: '',
    observacoes_vistoria: ''
  });
  const [isSavingFianza, setIsSavingFianza] = useState(false);
  const [isRegisteringFinance, setIsRegisteringFinance] = useState(false);

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

  // Abrir Modal de Vistoria de Fiança
  const handleOpenFianzaModal = (contrato: ContratoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFianzaModalContrato(contrato);
    const fd = contrato.fianza_detalhes || {
      fianza_valor: contrato.fianza_valor || 0,
      estado_fianza: contrato.status === 'Activo' ? 'En Custodia' : 'Devuelta',
      recaudo_devuelto: 0,
      deducoes_danos: 0,
      deducoes_suministros: 0,
      documentos_url: '',
      observacoes_vistoria: ''
    };
    setFianzaForm({ ...fd, fianza_valor: fd.fianza_valor || contrato.fianza_valor || 0 });
  };

  // Salvar Vistoria de Fiança
  const handleSaveFianza = async () => {
    if (!fianzaModalContrato) return;
    try {
      setIsSavingFianza(true);
      await contratosLogisticsService.salvarVistoriaFianza(fianzaModalContrato.alojamento_id || fianzaModalContrato.id, fianzaForm);
      alert('✅ ¡Datos de la fianza e informe de inspección guardados con éxito!');
      setFianzaModalContrato(null);
      loadContratos();
    } catch (err: any) {
      console.error('Error al guardar fianza:', err);
      alert(`Error al guardar: ${err?.message || 'Compruebe la conexión.'}`);
    } finally {
      setIsSavingFianza(false);
    }
  };

  // Registrar Devolução de Fiança no Financeiro
  const handleRegistrarEntradaFinanceiro = async () => {
    if (!fianzaModalContrato) return;
    if (fianzaForm.recaudo_devuelto <= 0) {
      alert('Aviso: Especifique el importe reembolsado / devuelto a cuenta antes de registrar la entrada.');
      return;
    }

    try {
      setIsRegisteringFinance(true);
      await financeLogisticsService.registrarDevolucaoFianza({
        contrato_id: fianzaModalContrato.codigo,
        alojamento_id: fianzaModalContrato.alojamento_id,
        alojamento_nome: fianzaModalContrato.alojamento_nome,
        alojamento_codigo: fianzaModalContrato.alojamento?.codigo,
        provedor_id: fianzaModalContrato.provedor_id,
        provedor_nome: fianzaModalContrato.provedor_nome,
        iban_cobranca: fianzaModalContrato.iban_cobranca,
        banco: fianzaModalContrato.banco,
        titular: fianzaModalContrato.titular,
        centro_custo_cliente: fianzaModalContrato.cliente_nome,
        centro_custo_obra: fianzaModalContrato.centro_custo_obra,
        valor_devolvido: Number(fianzaForm.recaudo_devuelto),
        valor_danos: Number(fianzaForm.deducoes_danos || 0),
        valor_suministros: Number(fianzaForm.deducoes_suministros || 0),
        documentos_url: fianzaForm.documentos_url,
        observacoes: fianzaForm.observacoes_vistoria
      });

      // Salvar estado também no contrato
      await contratosLogisticsService.salvarVistoriaFianza(fianzaModalContrato.alojamento_id || fianzaModalContrato.id, {
        ...fianzaForm,
        estado_fianza: fianzaForm.deducoes_danos > 0 || fianzaForm.deducoes_suministros > 0 ? 'Devuelta Parcial' : 'Devuelta'
      });

      alert(`🎉 ¡Entrada de reembolso de fianza por € ${Number(fianzaForm.recaudo_devuelto).toLocaleString('es-ES', { minimumFractionDigits: 2 })} registrada con éxito en Finanzas!`);
      setFianzaModalContrato(null);
      loadContratos();
    } catch (err: any) {
      console.error('Error al registrar en finanzas:', err);
      alert(`Error al registrar en finanzas: ${err?.message}`);
    } finally {
      setIsRegisteringFinance(false);
    }
  };

  // Gerar OP Individual de Aluguel
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

  // Métricas Consolidadas de Fianças
  const totalFiancasCustodia = useMemo(() => 
    contratosAtivosList.reduce((acc, c) => acc + (Number(c.fianza_valor) || 0), 0),
    [contratosAtivosList]
  );

  const totalFiancasDevolvidas = useMemo(() => 
    contratos.reduce((acc, c) => acc + (Number(c.fianza_detalhes?.recaudo_devuelto) || 0), 0),
    [contratos]
  );

  const totalDeducoesDanos = useMemo(() => 
    contratos.reduce((acc, c) => acc + (Number(c.fianza_detalhes?.deducoes_danos) || 0) + (Number(c.fianza_detalhes?.deducoes_suministros) || 0), 0),
    [contratos]
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
        (c.fianza_detalhes?.observacoes_vistoria && c.fianza_detalhes.observacoes_vistoria.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
        if (Number(c.fianza_valor) <= 0) return false;
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
                  Contratos de Arrendamiento & Control de Fianzas
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
                  {contratosAtivos} Activos en Curso
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gestión de alquileres (Fijos, Habitación, Temporal), control de fianzas en custodia, informes de vistoria y devolución financiera
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
            <span className="text-purple-600 font-bold">{temporaisAtivos.length} Hotel</span>
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

        {/* Fianças em Custódia Activa */}
        <div 
          onClick={() => { setStatusFilter('com_fianca'); setVencimentoRange('todos'); }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 rounded-2xl space-y-1 shadow-xs cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="group-hover:text-purple-600 transition-colors">Fianzas en Custodia Activa</span>
            <ShieldCheck size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            € {totalFiancasCustodia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Garantías retenidas en inmuebles activos
          </span>
        </div>

        {/* Fianças Recuperadas & Retenções */}
        <div 
          onClick={() => { setStatusFilter('com_fianca'); setVencimentoRange('todos'); }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 rounded-2xl space-y-1 shadow-xs cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="group-hover:text-emerald-600 transition-colors">Fianzas Reembolsadas</span>
            <ShieldAlert size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            € {totalFiancasDevolvidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-bold">
            <span>€ {totalDeducoesDanos.toLocaleString('es-ES', { minimumFractionDigits: 2 })} retenidos por daños/suministros</span>
          </div>
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
              placeholder="Buscar por código, dirección, cliente, empresa, fianza u observaciones..."
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
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                statusFilter === 'com_fianca'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              <ShieldCheck size={13} />
              <span>Con Fianza ({contratos.filter(c => Number(c.fianza_valor) > 0).length})</span>
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
              Cargando contratos de alojamientos, ocupantes y fianzas...
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
                  <th className="px-3 py-3">Fianza & Vistoria</th>
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
                  const fd = c.fianza_detalhes;

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

                        {/* Fiança & Vistoria (Interativo) */}
                        <td className="px-3 py-3.5" onClick={e => handleOpenFianzaModal(c, e)}>
                          {c.fianza_valor > 0 ? (
                            <div className="space-y-0.5 group/fianza">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border transition-all ${
                                fd?.estado_fianza === 'Devuelta' || fd?.estado_fianza === 'Devuelta Parcial'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : fd?.estado_fianza === 'No Devuelta'
                                  ? 'bg-red-50 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300'
                                  : fd?.estado_fianza === 'En Inspeccion'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 group-hover/fianza:border-purple-400'
                              }`}>
                                <ShieldCheck size={11} />
                                € {c.fianza_valor?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[9px] text-slate-400 block font-medium group-hover/fianza:text-purple-600 transition-colors">
                                {fd?.estado_fianza === 'Devuelta' ? '✓ Devuelta a banco' :
                                 fd?.estado_fianza === 'Devuelta Parcial' ? `✓ Dev. € ${fd.recaudo_devuelto} | Daños: € ${fd.deducoes_danos}` :
                                 fd?.estado_fianza === 'No Devuelta' ? '✗ Retenida por daños' :
                                 fd?.estado_fianza === 'En Inspeccion' ? '⚠️ En inspección' :
                                 '🛡️ En custodia activa'}
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
                            {c.fianza_valor > 0 && (
                              <button
                                onClick={e => handleOpenFianzaModal(c, e)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
                                title="Control de Vistoria y Devolución de Fianza"
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}

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

      {/* MODAL DE VISTORIA, INSPECCIÓN & LIQUIDACIÓN DE FIANZA */}
      {fianzaModalContrato && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-600 text-white rounded-2xl shadow-sm">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      Control de Fianza & Vistoria de Salida
                    </h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                      {fianzaModalContrato.codigo}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{fianzaModalContrato.alojamento_nome}</p>
                </div>
              </div>

              <button
                onClick={() => setFianzaModalContrato(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              {/* Resumo Fiança Depositada */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Fianza Original</span>
                  <span className="font-black text-slate-900 dark:text-white text-base">
                    € {Number(fianzaForm.fianza_valor).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Reembolsado a Banco</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-base">
                    € {Number(fianzaForm.recaudo_devuelto || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-red-50/50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900/60">
                  <span className="text-[10px] text-red-700 dark:text-red-300 font-bold uppercase block">Retenido por Daños/Gastos</span>
                  <span className="font-black text-red-700 dark:text-red-300 text-base">
                    € {(Number(fianzaForm.deducoes_danos || 0) + Number(fianzaForm.deducoes_suministros || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Status da Fiança */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estado de la Fianza / Vistoria
                  </label>
                  <select
                    value={fianzaForm.estado_fianza}
                    onChange={e => setFianzaForm({ ...fianzaForm, estado_fianza: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="En Custodia">🛡️ En Custodia (Alojamiento activo, fianza depositada con el arrendador)</option>
                    <option value="En Inspeccion">⚠️ En Inspección / Check-out (Pendiente de vistoria y acuerdo de salida)</option>
                    <option value="Devuelta">✓ Devuelta Total (100% reintegrada a la cuenta bancaria)</option>
                    <option value="Devuelta Parcial">⚡ Devuelta Parcial (Reintegrada con deducciones por daños/suministros)</option>
                    <option value="No Devuelta">✗ No Devuelta (Retenida por el arrendador por daños/incumplimiento)</option>
                  </select>
                </div>

                {/* Campos de Valores de Liquidação */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                      Importe Reembolsado (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fianzaForm.recaudo_devuelto}
                      onChange={e => setFianzaForm({ ...fianzaForm, recaudo_devuelto: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-red-700 dark:text-red-300 mb-1">
                      Deducción por Daños (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fianzaForm.deducoes_danos}
                      onChange={e => setFianzaForm({ ...fianzaForm, deducoes_danos: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold text-red-700 dark:text-red-300"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-700 dark:text-amber-300 mb-1">
                      Deducción Suministros (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fianzaForm.deducoes_suministros}
                      onChange={e => setFianzaForm({ ...fianzaForm, deducoes_suministros: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Link de Documentos / Fotos da Vistoria */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Enlace a Documentos / Informe de Vistoria / Fotos (URL)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={fianzaForm.documentos_url || ''}
                      onChange={e => setFianzaForm({ ...fianzaForm, documentos_url: e.target.value })}
                      placeholder="https://sharepoint.com/fianzas/laudo_vistoria.pdf"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                    {fianzaForm.documentos_url && (
                      <a
                        href={fianzaForm.documentos_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <ExternalLink size={13} />
                        Abrir
                      </a>
                    )}
                  </div>
                </div>

                {/* Observações da Vistoria */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Observaciones de la Inspección / Motivos de Retención o Acuerdo
                  </label>
                  <textarea
                    rows={3}
                    value={fianzaForm.observacoes_vistoria || ''}
                    onChange={e => setFianzaForm({ ...fianzaForm, observacoes_vistoria: e.target.value })}
                    placeholder="Detalle los daños alegados por el propietario, reparaciones, facturas de servicios pendientes o acuerdo alcanzado..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-2">
              <button
                onClick={() => setFianzaModalContrato(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
              >
                Cerrar
              </button>

              <div className="flex items-center gap-2">
                {fianzaForm.recaudo_devuelto > 0 && (
                  <button
                    onClick={handleRegistrarEntradaFinanceiro}
                    disabled={isRegisteringFinance}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    title="Dar entrada del dinero devuelto en Finanzas"
                  >
                    <DollarSign size={14} />
                    {isRegisteringFinance ? 'Registrando...' : `📥 Registrar Entrada en Finanzas (€ ${fianzaForm.recaudo_devuelto})`}
                  </button>
                )}

                <button
                  onClick={handleSaveFianza}
                  disabled={isSavingFianza}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSavingFianza ? 'Guardando...' : 'Guardar Vistoria'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES GERAIS DO CONTRATO */}
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
              <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} />
                    Garantía / Fianza Registrada
                  </span>
                  {viewingContrato.fianza_valor > 0 && (
                    <button
                      onClick={e => handleOpenFianzaModal(viewingContrato, e)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold transition-colors"
                    >
                      Abrir Control de Vistoria
                    </button>
                  )}
                </div>
                <p className="font-black text-slate-800 dark:text-slate-100 text-sm">
                  {viewingContrato.fianza_valor > 0
                    ? `€ ${viewingContrato.fianza_valor.toLocaleString('es-ES', { minimumFractionDigits: 2 })} (${viewingContrato.fianza_meses} meses) - Estado: ${viewingContrato.fianza_detalhes?.estado_fianza || 'En Custodia'}`
                    : 'Sin exigencia de fianza'}
                </p>
                {viewingContrato.fianza_detalhes?.observacoes_vistoria && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-purple-100 dark:border-purple-900/40 italic">
                    "{viewingContrato.fianza_detalhes.observacoes_vistoria}"
                  </p>
                )}
              </div>

              {/* Dados Bancários */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
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
