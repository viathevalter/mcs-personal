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
  Wrench
} from 'lucide-react';
import { financeLogisticsService } from '../services/financeLogisticsService';
import type { PagoAlojamento } from '../services/financeLogisticsService';
import { logisticsService } from '../services/logisticsService';
import type { Alojamento, Provedor } from '../services/logisticsService';

export const FinanceiroLogisticaPage: React.FC = () => {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState<PagoAlojamento[]>([]);
  const [alojamentos, setAlojamentos] = useState<Alojamento[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [copiedIban, setCopiedIban] = useState<string | null>(null);

  // Modal Nueva OP
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlojamentoId, setSelectedAlojamentoId] = useState<string>('');
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [tipoGasto, setTipoGasto] = useState<PagoAlojamento['tipo_pago']>('Aluguel');
  const [valorGasto, setValorGasto] = useState<number>(0);
  const [vencimentoGasto, setVencimentoGasto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [competenciaGasto, setCompetenciaGasto] = useState<string>('09/2026');
  const [clienteCentroCusto, setClienteCentroCusto] = useState<string>('');
  const [obraCentroCusto, setObraCentroCusto] = useState<string>('');
  const [observacoesGasto, setObservacoesGasto] = useState<string>('');
  const [isSavingOp, setIsSavingOp] = useState(false);

  // Modal Detalles
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

  const handleEnviarAprovacao = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await financeLogisticsService.enviarParaAprovacao(op.id);
      alert(`¡Orden de Pago ${op.codigo_pago} enviada a aprobación de Finanzas!`);
      loadData();
    } catch (err) {
      console.error('Error al enviar OP:', err);
    }
  };

  const handleAprovarOp = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await financeLogisticsService.aprovarOrdemPagamento(op.id);
      alert(`¡Orden de Pago ${op.codigo_pago} aprobada para pago!`);
      loadData();
    } catch (err) {
      console.error('Error al aprobar OP:', err);
    }
  };

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

      await financeLogisticsService.gerarOrdemPagamento({
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

      alert('¡Orden de Pago creada con éxito!');
      setIsModalOpen(false);
      setSelectedAlojamentoId('');
      setValorGasto(0);
      setObservacoesGasto('');
      loadData();
    } catch (err) {
      console.error('Error al crear OP:', err);
      alert('Error al crear Orden de Pago.');
    } finally {
      setIsSavingOp(false);
    }
  };

  // KPIs
  const totalValor = pagos
    .filter(p => p.status_pago !== 'Cancelado')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const pendentesAprovacao = pagos
    .filter(p => p.status_pago === 'Aguardando Aprovação')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

  const aprovados = pagos
    .filter(p => p.status_pago === 'Aprovado' || p.status_pago === 'Pago')
    .reduce((acc, p) => acc + (Number(p.valor_previsto) || 0), 0);

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
    return true;
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Aluguel':
        return <Home size={13} className="text-blue-500" />;
      case 'Fiança':
        return <ShieldCheck size={13} className="text-emerald-500" />;
      case 'Luz':
        return <Zap size={13} className="text-amber-500" />;
      case 'Água':
        return <Droplets size={13} className="text-cyan-500" />;
      case 'Internet':
        return <Globe size={13} className="text-indigo-500" />;
      case 'Gás':
        return <Flame size={13} className="text-orange-500" />;
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
        return 'Fianza';
      case 'Luz':
        return 'Electricidad';
      case 'Água':
        return 'Agua';
      case 'Internet':
        return 'Internet / Fibra';
      case 'Gás':
        return 'Gas';
      case 'Manutenção / Limpeza':
        return 'Mantenimiento / Limpieza';
      default:
        return tipo;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aprovado':
      case 'Pago':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} />
            {status === 'Pago' ? 'Pagado' : 'Aprobado'}
          </span>
        );
      case 'Aguardando Aprovação':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1 w-fit">
            <Clock size={11} />
            Pendiente Aprobación
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1 w-fit">
            Borrador
          </span>
        );
    }
  };

  const handleResetAllPagos = async () => {
    if (confirm('¿Desea reiniciar todas las Órdenes de Pago para iniciar el control real desde cero?')) {
      await financeLogisticsService.clearAllPagos();
      setPagos([]);
      alert('¡Órdenes de Pago reiniciadas con éxito!');
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
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Financiero de Logística & Órdenes de Pago
              </h1>
              <p className="text-xs text-slate-500">
                Seguimiento y emisión de OPs para alquiler, suministros (luz, agua, internet), fianzas e imputación por Centro de Coste
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {pagos.length > 0 && (
            <button
              onClick={handleResetAllPagos}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition-colors"
            >
              Reiniciar Lista
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nueva Orden de Pago / Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Previsto Mes</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            € {totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            {pagos.length} órdenes de pago registradas
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Pendiente Aprobación</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            € {pendentesAprovacao.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            En cola de Finanzas
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Aprobados / Pagados</span>
            <CheckCircle2 size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
            € {aprovados.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            ✓ Liberados para liquidación
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Centros de Coste</span>
            <Building size={16} className="text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
            100% Imputados
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            Vinculados a Clientes & Obras
          </p>
        </div>
      </div>

      {/* Tabela de OPs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filtros */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por código OP, inmueble, proveedor o cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'todos' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-500'
                }`}
              >
                Todas ({pagos.length})
              </button>
              <button
                onClick={() => setStatusFilter('Rascunho')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'Rascunho' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-500'
                }`}
              >
                Borradores
              </button>
              <button
                onClick={() => setStatusFilter('Aguardando Aprovação')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'Aguardando Aprovação' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-500'
                }`}
              >
                Pendientes
              </button>
              <button
                onClick={() => setStatusFilter('Aprovado')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  statusFilter === 'Aprovado' ? 'bg-slate-100 dark:bg-slate-800 text-blue-600' : 'text-slate-500'
                }`}
              >
                Aprobadas
              </button>
            </div>
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              Cargando órdenes de pago...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <FileText size={36} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Ninguna orden de pago encontrada</p>
              <p className="text-xs text-slate-400">
                Genere OPs a partir de los contratos en <strong>"Contratos & Fianzas"</strong> o cree una nueva factura de suministros.
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
                  <th className="px-4 py-3">Código OP & Categoría</th>
                  <th className="px-4 py-3">Alojamiento Vinculado</th>
                  <th className="px-4 py-3">Proveedor / IBAN</th>
                  <th className="px-4 py-3">Centro de Coste (Cliente/Obra)</th>
                  <th className="px-4 py-3">Competencia & Vencimiento</th>
                  <th className="px-4 py-3">Importe Previsto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones Financieras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map(op => (
                  <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Código & Tipo */}
                    <td className="px-4 py-3.5">
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
                            {op.alojamento_codigo}
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
                        <span className="text-[10px] text-slate-400">IBAN no informado</span>
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
                      <span className="text-[10px] text-slate-400">Comp: {op.periodo_competencia}</span>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3.5">
                      <span className="font-black text-slate-900 dark:text-white text-xs">
                        € {Number(op.valor_previsto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{getStatusBadge(op.status_pago)}</td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 text-right">
                      {op.status_pago === 'Rascunho' && (
                        <button
                          onClick={e => handleEnviarAprovacao(op, e)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Send size={12} />
                          Enviar a Aprobación
                        </button>
                      )}

                      {op.status_pago === 'Aguardando Aprovação' && (
                        <button
                          onClick={e => handleAprovarOp(op, e)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <Check size={12} />
                          Aprobar
                        </button>
                      )}

                      {(op.status_pago === 'Aprovado' || op.status_pago === 'Pago') && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle2 size={13} />
                          En Tesorería
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                    Registro de facturas de suministros, alquiler o servicios de mantenimiento
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

            <form onSubmit={handleSaveNovaOp} className="p-6 space-y-4 text-xs">
              {/* Imóvel e Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alojamiento Vinculado:
                  </label>
                  <select
                    value={selectedAlojamentoId}
                    onChange={e => handleSelectAlojamento(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="">Seleccione un inmueble...</option>
                    {alojamentos.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.codigo} - {a.nome} ({a.municipio || 'España'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Gasto / Factura:
                  </label>
                  <select
                    value={tipoGasto}
                    onChange={e => setTipoGasto(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="Aluguel">Alquiler Mensual</option>
                    <option value="Fiança">Fianza / Depósito</option>
                    <option value="Luz">Electricidad / Luz</option>
                    <option value="Água">Agua</option>
                    <option value="Internet">Internet / Fibra</option>
                    <option value="Gás">Gas</option>
                    <option value="Manutenção / Limpeza">Mantenimiento / Limpieza</option>
                  </select>
                </div>
              </div>

              {/* Valor e Vencimento */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Importe Previsto (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={valorGasto || ''}
                    onChange={e => setValorGasto(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Vencimiento:
                  </label>
                  <input
                    type="date"
                    value={vencimentoGasto}
                    onChange={e => setVencimentoGasto(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Competencia (MM/AAAA):
                  </label>
                  <input
                    type="text"
                    placeholder="09/2026"
                    value={competenciaGasto}
                    onChange={e => setCompetenciaGasto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Centro de Custo */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Imputación Contable & Centro de Coste
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Cliente del Proyecto:
                    </label>
                    <input
                      type="text"
                      value={clienteCentroCusto}
                      onChange={e => setClienteCentroCusto(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Obra / Fábrica:
                    </label>
                    <input
                      type="text"
                      value={obraCentroCusto}
                      onChange={e => setObraCentroCusto(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones / Ref. Factura:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Factura luz mensual referencia #99482"
                  value={observacoesGasto}
                  onChange={e => setObservacoesGasto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center -mx-6 -mb-6 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingOp}
                  className="px-4 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSavingOp ? 'Guardando...' : 'Crear Orden de Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
