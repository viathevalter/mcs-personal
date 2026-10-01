import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  Home,
  CreditCard,
  Send,
  Check,
  X,
  FileText,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Copy,
  Zap,
  Droplets,
  Globe,
  Flame,
  Wrench,
  Pencil,
  Trash2,
  Ban,
  FileCheck,
  ExternalLink,
  Filter
} from 'lucide-react';
import { financeLogisticsService } from '../services/financeLogisticsService';
import type { PagoAlojamento } from '../services/financeLogisticsService';
import { logisticsService } from '../services/logisticsService';
import type { Alojamento, Provedor } from '../services/logisticsService';
import { EditarOrdemPagoModal } from '../components/EditarOrdemPagoModal';
import { ReciboPagoModal } from '../components/ReciboPagoModal';

export const FinanceiroLogisticaPage: React.FC = () => {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState<PagoAlojamento[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [competenciaFilter, setCompetenciaFilter] = useState<string>('todos');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Seleção Múltipla para Envio em Lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSendingBatch, setIsSendingBatch] = useState(false);

  // Modais de Edição e Recibo
  const [editingOp, setEditingOp] = useState<PagoAlojamento | null>(null);
  const [receiptOp, setReceiptOp] = useState<PagoAlojamento | null>(null);

  // Modal Nueva OP
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlojamentoId, setSelectedAlojamentoId] = useState<string>('');
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [tipoGasto, setTipoGasto] = useState<PagoAlojamento['tipo_pago']>('Aluguel');
  const [valorGasto, setValorGasto] = useState<number>(0);
  const [vencimentoGasto, setVencimentoGasto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [competenciaGasto, setCompetenciaGasto] = useState<string>('10/2026');
  const [clienteCentroCusto, setClienteCentroCusto] = useState<string>('');
  const [obraCentroCusto, setObraCentroCusto] = useState<string>('');
  const [observacoesGasto, setObservacoesGasto] = useState<string>('');
  const [isSavingOp, setIsSavingOp] = useState(false);

  // Modal Detalhes Simples
  const [viewingOp, setViewingOp] = useState<PagoAlojamento | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pagosData, alojData, provData, alocsData] = await Promise.all([
        financeLogisticsService.fetchPagos(),
        logisticsService.fetchAlojamentos(),
        logisticsService.fetchProvedores(),
        logisticsService.fetchAlocacoesAtivas()
      ]);
      setPagos(pagosData);
      setAlojamentos(alojData);
      setProvedores(provData);
      setAlocacoes(alocsData);
    } catch (err) {
      console.error('Error al cargar pagos de logística:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extrair lista de competências únicas existentes para filtro
  const competenciasUnicas = Array.from(
    new Set(pagos.map(p => p.periodo_competencia).filter(Boolean))
  ).sort().reverse();

  const handleSelectAlojamento = (alojId: string) => {
    setSelectedAlojamentoId(alojId);
    if (!alojId) {
      setClienteCentroCusto('');
      setObraCentroCusto('');
      return;
    }

    const aloj = alojamentos.find(a => a.id === alojId);
    if (!aloj) return;

    // Buscar ocupantes ativos
    const occ = alocacoes.filter(a => 
      a.status !== 'Checkout' && 
      (a.alojamento_id === alojId || a.alojamento_codigo === aloj.codigo || (a.alojamento_nome && (a.alojamento_nome === aloj.nome || a.alojamento_nome === aloj.titulo)))
    );

    if (occ.length > 0) {
      const uniqueClients = Array.from(new Set(occ.map(o => o.cliente_nome).filter(Boolean)));
      setClienteCentroCusto(uniqueClients.join(', '));
    } else {
      setClienteCentroCusto(aloj.cliente_nome || (aloj.municipio ? `Obra ${aloj.municipio}` : 'Centro de Coste General'));
    }

    setObraCentroCusto(`Obra ${aloj.municipio || aloj.provincia || 'Principal'}`);

    if (tipoGasto === 'Aluguel' && (aloj.custo_mensal_total || aloj.valor_mensal)) {
      setValorGasto(Number(aloj.custo_mensal_total || aloj.valor_mensal));
    }
  };

  const handleCopyIban = (iban: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(iban);
    setCopiedIban(iban);
    setTimeout(() => setCopiedIban(null), 2000);
  };

  // Enviar individual para aprovação
  const handleEnviarAprovacao = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await financeLogisticsService.enviarParaAprovacao(op.id);
      alert(`¡Orden de Pago ${op.codigo_pago} enviada a aprobación de Finanzas!`);
      loadData();
    } catch (err) {
      console.error('Error al enviar OP:', err);
      alert('Error al enviar a aprobación.');
    }
  };

  // Enviar lote selecionado para aprovação
  const handleEnviarLoteAprovacao = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!confirm(`¿Desea enviar ${ids.length} órdenes seleccionadas a aprobación de Finanzas?`)) {
      return;
    }

    try {
      setIsSendingBatch(true);
      await financeLogisticsService.enviarParaAprovacao(ids);
      alert(`¡Se enviaron ${ids.length} órdenes a aprobación de Finanzas con éxito!`);
      setSelectedIds(new Set());
      loadData();
    } catch (err) {
      console.error('Error al enviar lote:', err);
      alert('Error al enviar el lote a aprobación.');
    } finally {
      setIsSendingBatch(false);
    }
  };

  // Excluir ordem (somente rascunhos)
  const handleExcluirOp = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`¿Está seguro de que desea eliminar la orden de pago borrador ${op.codigo_pago}? Esta acción es permanente.`)) {
      return;
    }

    try {
      await financeLogisticsService.excluirOrdemPagamento(op.id);
      alert(`Orden de pago ${op.codigo_pago} eliminada.`);
      loadData();
    } catch (err: any) {
      console.error('Error al eliminar OP:', err);
      alert(`Error al eliminar: ${err?.message || 'Compruebe los permisos.'}`);
    }
  };

  // Cancelar ordem de pagamento
  const handleCancelarOp = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const motivo = prompt(`Informe el motivo de cancelación de la orden ${op.codigo_pago}:`, 'Cancelada por Logística');
    if (motivo === null) return; // Cancelou prompt

    try {
      await financeLogisticsService.cancelarOrdemPagamento(op.id, motivo);
      alert(`¡Orden de pago ${op.codigo_pago} cancelada con éxito!`);
      loadData();
    } catch (err: any) {
      console.error('Error al cancelar OP:', err);
      alert(`Error al cancelar: ${err?.message || 'Compruebe la conexión.'}`);
    }
  };

  // Salvar Nova OP (nasce como Rascunho / Opção B)
  const handleSaveNovaOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlojamentoId || valorGasto <= 0) {
      alert('Seleccione un inmueble e informe un importe válido.');
      return;
    }

    try {
      setIsSavingOp(true);
      const aloj = alojamentos.find(a => a.id === selectedAlojamentoId);
      const prov = provedores.find(p => p.id === aloj?.provedor_id);

      const novaOp = await financeLogisticsService.gerarOrdemPagamento({
        alojamento_id: selectedAlojamentoId,
        alojamento_nome: aloj?.nome || 'Alojamiento',
        alojamento_codigo: aloj?.codigo || 'AL-XXXX',
        provedor_id: aloj?.provedor_id,
        provedor_nome: prov?.nome_razao_social || 'Proveedor Inmobiliario',
        iban_cobranca: prov?.iban || (aloj?.contrato as any)?.iban || '',
        banco: prov?.banco || '',
        titular: prov?.titular_conta || prov?.nome_razao_social || '',
        centro_custo_cliente: clienteCentroCusto,
        centro_custo_obra: obraCentroCusto,
        tipo_pago: tipoGasto,
        valor: valorGasto,
        data_vencimento: vencimentoGasto,
        periodo_competencia: competenciaGasto,
        observacoes: observacoesGasto
      });

      alert(`¡Orden de Pago ${novaOp.codigo_pago} creada como Borrador con éxito!\nPuede revisarla y enviarla a aprobación.`);
      setIsModalOpen(false);
      setSelectedAlojamentoId('');
      setValorGasto(0);
      setObservacoesGasto('');
      loadData();
    } catch (err: any) {
      console.error('Error al crear OP:', err);
      alert(`Error al crear Orden de Pago: ${err?.message || 'Compruebe los datos.'}`);
    } finally {
      setIsSavingOp(false);
    }
  };

  // Controle de Seleção
  const toggleSelectOp = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  // KPIs
  const totalValor = pagos
    .filter(p => p.status_pago !== 'Cancelado')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const rascunhosValor = pagos
    .filter(p => p.status_pago === 'Rascunho')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const pendentesAprovacao = pagos
    .filter(p => p.status_pago === 'Aguardando Aprovação')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const aprovadosPagados = pagos
    .filter(p => p.status_pago === 'Aprovado' || p.status_pago === 'Pago')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  // Filtragem da Lista
  const filtered = pagos.filter(p => {
    const matchesSearch =
      p.codigo_pago.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.alojamento_nome && p.alojamento_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.provedor_nome && p.provedor_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.centro_custo_cliente && p.centro_custo_cliente.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.iban_cobranca && p.iban_cobranca.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter !== 'todos' && p.status_pago !== statusFilter) return false;
    if (tipoFilter !== 'todos' && p.tipo_pago !== tipoFilter) return false;
    if (competenciaFilter !== 'todos' && p.periodo_competencia !== competenciaFilter) return false;
    return true;
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Aluguel':
        return <Home size={13} className="text-blue-500" />;
      case 'Fiança':
      case 'Fianza_Saida':
      case 'Fianza_Devolucion':
        return <ShieldCheck size={13} className="text-emerald-500" />;
      case 'Luz':
      case 'Suministro_Luz':
        return <Zap size={13} className="text-amber-500" />;
      case 'Água':
      case 'Suministro_Agua':
        return <Droplets size={13} className="text-cyan-500" />;
      case 'Internet':
      case 'Suministro_Internet':
        return <Globe size={13} className="text-indigo-500" />;
      case 'Gás':
      case 'Suministro_Gas':
        return <Flame size={13} className="text-orange-500" />;
      case 'Manutencao_Limpeza':
      case 'Manutenção / Limpeza':
        return <Wrench size={13} className="text-slate-500" />;
      default:
        return <DollarSign size={13} className="text-slate-500" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'Aluguel':
        return 'Alquiler Mensual';
      case 'Fiança':
      case 'Fianza_Saida':
        return 'Fianza Depósito';
      case 'Fianza_Devolucion':
        return 'Devolución Fianza';
      case 'Luz':
      case 'Suministro_Luz':
        return 'Electricidad';
      case 'Água':
      case 'Suministro_Agua':
        return 'Agua';
      case 'Internet':
      case 'Suministro_Internet':
        return 'Internet / Fibra';
      case 'Gás':
      case 'Suministro_Gas':
        return 'Gas';
      case 'Manutencao_Limpeza':
      case 'Manutenção / Limpeza':
        return 'Mantenimiento / Limpieza';
      default:
        return tipo;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} />
            Pagado / Liquidado
          </span>
        );
      case 'Aprovado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} />
            Aprobado (En Tesorería)
          </span>
        );
      case 'Aguardando Aprovação':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 w-fit">
            <Clock size={11} />
            Pendiente Aprobación
          </span>
        );
      case 'Cancelado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 flex items-center gap-1 w-fit">
            <Ban size={11} />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1 w-fit">
            <Pencil size={10} />
            Borrador (Rascunho)
          </span>
        );
    }
  };

  return (
    <div className="w-full px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
              <DollarSign size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                Financiero de Logística & Órdenes de Pago
              </h1>
              <p className="text-xs text-slate-500">
                Seguimiento, emisión, edición y consulta de OPs integradas con Finanzas central
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            title="Recargar datos de Finanzas"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Actualizar
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Nueva Orden de Pago / Gasto
          </button>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total do Mês */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              TOTAL PREVISTO
            </span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">
              € {totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago !== 'Cancelado').length} órdenes activas registradas
            </span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Borradores */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              BORRADORES (RASCUNHO)
            </span>
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-0.5 block">
              € {rascunhosValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago === 'Rascunho').length} órdenes por revisar/enviar
            </span>
          </div>
          <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl">
            <Pencil size={22} />
          </div>
        </div>

        {/* Pendientes de Aprobación */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              PENDIENTE APROBACIÓN
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
              € {pendentesAprovacao.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago === 'Aguardando Aprovação').length} en cola de Finanzas
            </span>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
            <Clock size={22} />
          </div>
        </div>

        {/* Aprobados / Pagados */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              APROBADOS / PAGADOS
            </span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
              € {aprovadosPagados.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {pagos.filter(p => p.status_pago === 'Pago').length} pagados • {pagos.filter(p => p.status_pago === 'Aprovado').length} en tesorería
            </span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Barra de Ações em Lote quando há seleção */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg">
              <Check size={16} />
            </div>
            <div>
              <span className="font-bold text-sm">
                {selectedIds.size} {selectedIds.size === 1 ? 'orden seleccionada' : 'órdenes seleccionadas'}
              </span>
              <span className="text-xs text-slate-400 ml-2">
                (Total: € {pagos.filter(p => selectedIds.has(p.id)).reduce((acc, p) => acc + p.valor_previsto, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEnviarLoteAprovacao}
              disabled={isSendingBatch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Send size={13} />
              {isSendingBatch ? 'Enviando...' : `Enviar ${selectedIds.size} a Aprobación`}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancelar Selección
            </button>
          </div>
        </div>
      )}

      {/* Tabela Principal & Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filtros */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Busca */}
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código OP, inmueble, proveedor o cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Seletores de Filtro */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Filtro por Competência */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar size={13} className="text-slate-400" />
              <span className="text-slate-500 font-semibold">Comp:</span>
              <select
                value={competenciaFilter}
                onChange={e => setCompetenciaFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="todos">Todas</option>
                {competenciasUnicas.map(comp => (
                  <option key={comp} value={comp}>{comp}</option>
                ))}
              </select>
            </div>

            {/* Abas Rápidas de Status */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold overflow-x-auto">
              {[
                { id: 'todos', label: 'Todas' },
                { id: 'Rascunho', label: 'Borradores' },
                { id: 'Aguardando Aprovação', label: 'Pendientes' },
                { id: 'Aprovado', label: 'Aprobadas' },
                { id: 'Pago', label: 'Pagadas' },
                { id: 'Cancelado', label: 'Canceladas' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              Cargando órdenes de pago desde Finanzas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Ninguna orden de pago encontrada</p>
              <p className="text-xs text-slate-400">
                Genere OPs a partir de los contratos en <strong>"Contratos & Fianzas"</strong> o cree una nueva orden con el botón superior.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2"
              >
                <Plus size={15} />
                Nueva Orden de Pago
              </button>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                    />
                  </th>
                  <th className="px-3 py-3">Código OP & Categoría</th>
                  <th className="px-4 py-3">Alojamiento Vinculado</th>
                  <th className="px-4 py-3">Proveedor / IBAN</th>
                  <th className="px-4 py-3">Centro de Coste (Cliente/Obra)</th>
                  <th className="px-4 py-3">Competencia & Vencimiento</th>
                  <th className="px-4 py-3">Importe Previsto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones & Comprobantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map(op => (
                  <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Checkbox Seleção */}
                    <td className="px-3 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(op.id)}
                        onChange={() => toggleSelectOp(op.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-600/20"
                      />
                    </td>

                    {/* Código & Tipo */}
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                          {op.codigo_pago}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 w-fit">
                          {getTipoIcon(op.tipo_pago)}
                          {getTipoLabel(op.tipo_pago)}
                        </span>
                      </div>
                    </td>

                    {/* Alojamento */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Home size={14} className="text-slate-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">
                            {op.alojamento_nome}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {op.alojamento_codigo || '-'} {op.contrato_id ? `• ${op.contrato_id}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Proveedor e IBAN */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{op.provedor_nome}</p>
                      {op.iban_cobranca ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-500">
                            {op.iban_cobranca.slice(0, 4)} •••• {op.iban_cobranca.slice(-4)}
                          </span>
                          <button
                            onClick={e => handleCopyIban(op.iban_cobranca || '', e)}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 ml-1"
                          >
                            <Copy size={10} />
                            {copiedIban === op.iban_cobranca ? '¡Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">IBAN no especificado</span>
                      )}
                    </td>

                    {/* Centro de Custo */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                        {op.centro_custo_cliente || 'Centro de Coste General'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                        {op.centro_custo_obra || 'Obra Principal'}
                      </span>
                    </td>

                    {/* Vencimento */}
                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300 block">
                        {op.data_vencimento}
                      </span>
                      <span className="text-[10px] text-slate-400">Comp: {op.periodo_competencia || '-'}</span>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3.5">
                      <span className="font-black text-slate-900 dark:text-white text-xs">
                        € {Number(op.valor_previsto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{getStatusBadge(op.status_pago)}</td>

                    {/* Ações e Comprovantes */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Ações para RASCUNHO / BORRADOR */}
                        {op.status_pago === 'Rascunho' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingOp(op); }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Modificar / Editar Orden de Pago"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={e => handleExcluirOp(op, e)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Eliminar borrador permanentemente"
                            >
                              <Trash2 size={14} />
                            </button>

                            <button
                              onClick={e => handleEnviarAprovacao(op, e)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                              title="Enviar a aprobación en Finanzas"
                            >
                              <Send size={11} />
                              Enviar
                            </button>
                          </>
                        )}

                        {/* Ações para AGUARDANDO APROVAÇÃO */}
                        {op.status_pago === 'Aguardando Aprovação' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingOp(op); }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Modificar datos de la orden"
                            >
                              <Pencil size={14} />
                            </button>

                            <button
                              onClick={e => handleCancelarOp(op, e)}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                              title="Cancelar orden de pago"
                            >
                              <Ban size={11} />
                              Cancelar
                            </button>
                          </>
                        )}

                        {/* Ações para APROVADO */}
                        {op.status_pago === 'Aprovado' && (
                          <>
                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                              <Clock size={11} />
                              En Tesorería
                            </span>
                            <button
                              onClick={e => handleCancelarOp(op, e)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                              title="Anular / Cancelar"
                            >
                              <Ban size={13} />
                            </button>
                          </>
                        )}

                        {/* Ações para PAGO */}
                        {op.status_pago === 'Pago' && (
                          <>
                            {op.comprovante_url && (
                              <a
                                href={op.comprovante_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                                title="Ver comprobante bancario"
                              >
                                <ExternalLink size={11} />
                                Comprobante
                              </a>
                            )}

                            <button
                              onClick={e => { e.stopPropagation(); setReceiptOp(op); }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                              title="Ver ficha de liquidación y comprobante"
                            >
                              <FileCheck size={12} className="text-emerald-500" />
                              Recibo
                            </button>
                          </>
                        )}

                        {/* Cancelado */}
                        {op.status_pago === 'Cancelado' && (
                          <span className="text-[10px] font-bold text-red-500">
                            Anulada
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de Modificação / Edição de Ordem */}
      {editingOp && (
        <EditarOrdemPagoModal
          op={editingOp}
          isOpen={!!editingOp}
          onClose={() => setEditingOp(null)}
          onSuccess={loadData}
        />
      )}

      {/* Modal de Recibo / Comprovante Imprimível */}
      {receiptOp && (
        <ReciboPagoModal
          op={receiptOp}
          onClose={() => setReceiptOp(null)}
        />
      )}

      {/* Modal Nova Ordem de Pagamento / Despesa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Nueva Orden de Pago / Gasto
                  </h2>
                  <p className="text-xs text-slate-500">
                    Se creará en estado <strong>Borrador (Rascunho)</strong> para revisión previa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveNovaOp} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {/* Seleção de Alojamento */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Home size={13} className="text-blue-500" />
                  Inmueble / Alojamiento Vinculado <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAlojamentoId}
                  onChange={e => handleSelectAlojamento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  required
                >
                  <option value="">Seleccione un alojamiento...</option>
                  {alojamentos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.codigo} - {a.nome} ({a.municipio || 'España'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Gasto e Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Tipo de Pago / Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tipoGasto}
                    onChange={e => setTipoGasto(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                    required
                  >
                    <option value="Aluguel">Alquiler Mensual</option>
                    <option value="Fianza_Saida">Fianza (Depósito)</option>
                    <option value="Suministro_Luz">Electricidad (Luz)</option>
                    <option value="Suministro_Agua">Agua</option>
                    <option value="Suministro_Gas">Gas</option>
                    <option value="Suministro_Internet">Internet / Wifi</option>
                    <option value="Manutencao_Limpeza">Mantenimiento / Limpieza</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Importe Previsto (€) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={valorGasto || ''}
                    onChange={e => setValorGasto(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Competência e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Mes / Competencia
                  </label>
                  <input
                    type="text"
                    placeholder="10/2026"
                    value={competenciaGasto}
                    onChange={e => setCompetenciaGasto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Fecha de Vencimiento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={vencimentoGasto}
                    onChange={e => setVencimentoGasto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Centros de Custo (Preenchidos automaticamente) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                    Cliente Imputado
                  </label>
                  <input
                    type="text"
                    value={clienteCentroCusto}
                    onChange={e => setClienteCentroCusto(e.target.value)}
                    placeholder="Cliente / Centro de Coste"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                    Obra
                  </label>
                  <input
                    type="text"
                    value={obraCentroCusto}
                    onChange={e => setObraCentroCusto(e.target.value)}
                    placeholder="Obra"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Observaciones / Notas Adicionales
                </label>
                <textarea
                  rows={2}
                  value={observacoesGasto}
                  onChange={e => setObservacoesGasto(e.target.value)}
                  placeholder="Detalles sobre este gasto, lecturas de contadores o datos bancarios..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingOp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Plus size={14} />
                  {isSavingOp ? 'Creando...' : 'Crear Orden Borrador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
