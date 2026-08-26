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

  // Modal Nova OP
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAlojamentoId, setSelectedAlojamentoId] = useState('');
  const [tipoGasto, setTipoGasto] = useState<PagoAlojamento['tipo_pago']>('Aluguel');
  const [valorGasto, setValorGasto] = useState<number>(0);
  const [vencimentoGasto, setVencimentoGasto] = useState<string>(new Date().toISOString().split('T')[0]);
  const [competenciaGasto, setCompetenciaGasto] = useState<string>('09/2026');
  const [clienteCentroCusto, setClienteCentroCusto] = useState<string>('BECK & POLLITZER IBERICA SLU');
  const [obraCentroCusto, setObraCentroCusto] = useState<string>('Obra Fábrica Arbúcies');
  const [observacoesGasto, setObservacoesGasto] = useState<string>('');
  const [isSavingOp, setIsSavingOp] = useState(false);

  // Modal Detalhes
  const [viewingOp, setViewingOp] = useState<PagoAlojamento | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pagosData, alojData, provData] = await Promise.all([
        financeLogisticsService.fetchPagos(),
        logisticsService.fetchAlojamentos(),
        logisticsService.fetchProvedores()
      ]);
      setPagos(pagosData);
      setAlojamentos(alojData);
      setProvedores(provData);
    } catch (err) {
      console.error('Erro ao carregar pagamentos da logística:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      alert(`Ordem de Pagamento ${op.codigo_pago} enviada para aprovação do Financeiro!`);
      loadData();
    } catch (err) {
      console.error('Erro ao enviar OP:', err);
    }
  };

  const handleAprovarOp = async (op: PagoAlojamento, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await financeLogisticsService.aprovarOrdemPagamento(op.id);
      alert(`Ordem de Pagamento ${op.codigo_pago} aprovada com sucesso!`);
      loadData();
    } catch (err) {
      console.error('Erro ao aprovar OP:', err);
    }
  };

  const handleCreateNewOp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlojamentoId || valorGasto <= 0) {
      alert('Selecione um alojamento e informe um valor válido.');
      return;
    }

    const aloj = alojamentos.find(a => a.id === selectedAlojamentoId);
    const prov = provedores.find(p => p.id === aloj?.provedor_id);
    const cont = aloj?.contrato || (aloj?.comodidades as any)?.__contrato || {};

    try {
      setIsSavingOp(true);
      await financeLogisticsService.gerarOrdemPagamento({
        alojamento_id: aloj?.id,
        alojamento_nome: aloj?.nome,
        alojamento_codigo: aloj?.codigo,
        provedor_id: aloj?.provedor_id,
        provedor_nome: prov?.nome_razao_social || 'Proveedor',
        iban_cobranca: cont.iban || prov?.iban || '',
        banco: cont.banco || prov?.banco || '',
        titular: cont.titular || prov?.titular_conta || prov?.nome_razao_social || '',
        centro_custo_cliente: clienteCentroCusto,
        centro_custo_obra: obraCentroCusto,
        tipo_pago: tipoGasto,
        valor: Number(valorGasto),
        data_vencimento: vencimentoGasto,
        periodo_competencia: competenciaGasto,
        observacoes: observacoesGasto
      });

      alert('Ordem de Pagamento criada com sucesso!');
      setIsModalOpen(false);
      setSelectedAlojamentoId('');
      setValorGasto(0);
      setObservacoesGasto('');
      loadData();
    } catch (err) {
      console.error('Erro ao criar OP:', err);
      alert('Erro ao criar Ordem de Pagamento.');
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

  const getTipoGastoBadge = (tipo: PagoAlojamento['tipo_pago']) => {
    switch (tipo) {
      case 'Aluguel':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"><Home size={11} /> Aluguel Mensal</span>;
      case 'Fianza_Saida':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"><ShieldCheck size={11} /> Fiança Entrada</span>;
      case 'Suministro_Luz':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300"><Zap size={11} /> Luz / Eletricidade</span>;
      case 'Suministro_Agua':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300"><Droplets size={11} /> Água</span>;
      case 'Suministro_Internet':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"><Globe size={11} /> Internet Fibra</span>;
      case 'Manutencao_Limpeza':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"><Wrench size={11} /> Manutenção / Limpeza</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">{tipo}</span>;
    }
  };

  const handleResetAllPagos = async () => {
    if (confirm('Deseja zerar todas as Ordens de Pagamento para iniciar o controle real do zero?')) {
      await financeLogisticsService.clearAllPagos();
      setPagos([]);
      alert('Ordens de Pagamento zeradas com sucesso!');
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
                Financeiro da Logística & Ordens de Pagamento
              </h1>
              <p className="text-xs text-slate-500">
                Acompanhamento e envio de OPs para aluguel, despesas (luz, água, internet), fianças e rateio por Centro de Custo
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
              Zerar Lista
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova Ordem de Pagamento / Despesa
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Total Previsto Mês</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            € {totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            {pagos.length} ordens de pagamento cadastradas
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Aguardando Aprovação</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            € {pendentesAprovacao.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
            <Send size={11} />
            Fila do financeiro da empresa
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Aprovados / Pagos</span>
            <CheckCircle2 size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
            € {aprovados.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            ✓ Liberados para quitação
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Centros de Custo</span>
            <Building size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            100% Rateados
          </p>
          <span className="text-[11px] text-purple-600 font-semibold">
            Vinculados a Clientes & Obras
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filters */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por código OP, imóvel, fornecedor ou cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'todos' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Todas ({pagos.length})
              </button>
              <button
                onClick={() => setStatusFilter('Rascunho')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'Rascunho' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Rascunhos
              </button>
              <button
                onClick={() => setStatusFilter('Aguardando Aprovação')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'Aguardando Aprovação' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Pendente Aprovação
              </button>
              <button
                onClick={() => setStatusFilter('Aprovado')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === 'Aprovado' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
              >
                Aprovados
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
              Carregando ordens de pagamento...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <DollarSign size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Nenhum registro financeiro encontrado</p>
              <p className="text-xs text-slate-400">Gere OPs de aluguel no módulo de contratos ou clique no botão acima para criar novas despesas.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Código OP & Categoria</th>
                  <th className="px-4 py-3">Alojamento Vinculado</th>
                  <th className="px-4 py-3">Proveedor / IBAN</th>
                  <th className="px-4 py-3">Centro de Custo (Cliente/Obra)</th>
                  <th className="px-4 py-3">Competência & Vencimento</th>
                  <th className="px-4 py-3">Valor Previsto</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações Financeiras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setViewingOp(p)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Código OP & Categoria */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-xs block group-hover:text-blue-600 transition-colors">
                          {p.codigo_pago}
                        </span>
                        {getTipoGastoBadge(p.tipo_pago)}
                      </div>
                    </td>

                    {/* Alojamento */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Home size={14} className="text-blue-500 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.alojamento_nome}</span>
                          <span className="text-[10px] font-mono text-slate-400">{p.alojamento_codigo}</span>
                        </div>
                      </div>
                    </td>

                    {/* Provedor & IBAN */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100">{p.provedor_nome}</p>
                      {p.iban_cobranca ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono text-[10px] text-slate-500">
                            {p.iban_cobranca.slice(0, 8)}...{p.iban_cobranca.slice(-4)}
                          </span>
                          <button
                            onClick={e => handleCopyIban(p.iban_cobranca!, e)}
                            className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 hover:bg-slate-200 rounded"
                            title="Copiar IBAN"
                          >
                            {copiedIban === p.iban_cobranca ? '✓' : 'Copiar'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Sem IBAN</span>
                      )}
                    </td>

                    {/* Centro de Custo */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{p.centro_custo_cliente || 'Cliente N/D'}</span>
                      <span className="text-[10px] text-slate-500">{p.centro_custo_obra || 'Obra N/D'}</span>
                    </td>

                    {/* Vigência / Vencimento */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{p.data_vencimento}</p>
                      <span className="text-[10px] text-slate-400">Comp: {p.periodo_competencia}</span>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        € {p.valor_previsto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          p.status_pago === 'Aprovado'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : p.status_pago === 'Aguardando Aprovação'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {p.status_pago}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status_pago === 'Rascunho' && (
                          <button
                            onClick={e => handleEnviarAprovacao(p, e)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                            title="Enviar Ordem para o Financeiro"
                          >
                            <Send size={12} />
                            Enviar p/ Aprovação
                          </button>
                        )}

                        {p.status_pago === 'Aguardando Aprovação' && (
                          <button
                            onClick={e => handleAprovarOp(p, e)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                            title="Aprovar Pagamento"
                          >
                            <Check size={12} />
                            Aprovar
                          </button>
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

      {/* ========================================================================= */}
      {/* MODAL: NOVA ORDEM DE PAGAMENTO / DESPESA                                 */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">Nova Ordem de Pagamento</h2>
                  <p className="text-xs text-slate-500">Lançamento de aluguel, contas de luz, água, internet ou reparos</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewOp} className="p-6 space-y-4 text-xs">
              {/* Seleção do Alojamento */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  1. Alojamento Vinculado:
                </label>
                <select
                  value={selectedAlojamentoId}
                  onChange={e => {
                    const alojId = e.target.value;
                    setSelectedAlojamentoId(alojId);
                    const aloj = alojamentos.find(a => a.id === alojId);
                    if (aloj) {
                      setValorGasto(aloj.valor_mensal || 0);
                      setObraCentroCusto(`Obra ${aloj.municipio || 'Principal'}`);
                    }
                  }}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  <option value="">Selecione o imóvel...</option>
                  {alojamentos.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.codigo} - {a.nome} ({a.municipio || 'Espanha'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Despesa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    2. Tipo de Despesa:
                  </label>
                  <select
                    value={tipoGasto}
                    onChange={e => setTipoGasto(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="Aluguel">Aluguel Mensal</option>
                    <option value="Fianza_Saida">Fiança / Depósito de Entrada</option>
                    <option value="Suministro_Luz">Fatura de Luz / Eletricidade</option>
                    <option value="Suministro_Agua">Fatura de Água</option>
                    <option value="Suministro_Gas">Fatura de Gás</option>
                    <option value="Suministro_Internet">Fatura de Internet / Fibra</option>
                    <option value="Manutencao_Limpeza">Manutenção / Limpeza do Imóvel</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    3. Valor (€):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorGasto}
                    onChange={e => setValorGasto(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-emerald-600"
                  />
                </div>
              </div>

              {/* Vencimento e Competência */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Vencimento:
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
                    Mês / Competência:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 09/2026"
                    value={competenciaGasto}
                    onChange={e => setCompetenciaGasto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Centro de Custo */}
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building size={13} />
                  Centro de Custo / Rateio Contábil
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Cliente Destino:</label>
                    <input
                      type="text"
                      value={clienteCentroCusto}
                      onChange={e => setClienteCentroCusto(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Obra / Projeto:</label>
                    <input
                      type="text"
                      value={obraCentroCusto}
                      onChange={e => setObraCentroCusto(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observações / Detalhes:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fatura de luz ref. mês de agosto da empresa Endesa"
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
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm disabled:opacity-50"
                >
                  {isSavingOp ? 'Gerando OP...' : 'Salvar & Gerar Ordem de Pagamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DA ORDEM DE PAGAMENTO                                    */}
      {/* ========================================================================= */}
      {viewingOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-2xl shadow-sm">
                  <DollarSign size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">{viewingOp.codigo_pago}</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {viewingOp.status_pago}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{viewingOp.alojamento_nome}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingOp(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Categoria</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{viewingOp.tipo_pago}</span>
                </div>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Valor Previsto</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-base">
                    € {viewingOp.valor_previsto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Dados Bancários */}
              <div className="p-4 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} />
                  Dados do Fornecedor & Pagamento
                </span>
                <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                  <p><span className="text-slate-400">Proveedor:</span> <strong>{viewingOp.provedor_nome}</strong></p>
                  <p><span className="text-slate-400">Banco:</span> <strong>{viewingOp.banco || '-'}</strong></p>
                  <p><span className="text-slate-400">Vencimento:</span> <strong>{viewingOp.data_vencimento}</strong></p>
                  <p><span className="text-slate-400">Competência:</span> <strong>{viewingOp.periodo_competencia}</strong></p>
                </div>
                {viewingOp.iban_cobranca && (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase block">IBAN</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{viewingOp.iban_cobranca}</span>
                    </div>
                    <button
                      onClick={() => handleCopyIban(viewingOp.iban_cobranca!)}
                      className="px-3 py-1 bg-purple-100 text-purple-800 font-bold rounded-lg"
                    >
                      {copiedIban === viewingOp.iban_cobranca ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>

              {/* Centro de Custo */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Centro de Custo</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">{viewingOp.centro_custo_cliente} • {viewingOp.centro_custo_obra}</p>
                <p className="text-[11px] text-slate-500 mt-1">{viewingOp.observacoes}</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex justify-between items-center">
              <button
                onClick={() => setViewingOp(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Fechar
              </button>
              {viewingOp.status_pago === 'Rascunho' && (
                <button
                  onClick={() => {
                    handleEnviarAprovacao(viewingOp);
                    setViewingOp(null);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Send size={13} />
                  Enviar para Aprovação do Financeiro
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
