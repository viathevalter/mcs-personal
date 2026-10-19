import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ExternalLink,
  Send,
  Users,
  RefreshCw,
  Stethoscope,
  HardHat,
  Banknote,
  Receipt,
  Download
} from 'lucide-react';
import { financeRhService, type OrdemPagamentoRh } from '../services/financeRhService';
import { NovaOrdemPagoRhModal } from '../components/NovaOrdemPagoRhModal';

export const FinanceiroRhPage: React.FC = () => {
  const [ordens, setOrdens] = useState<OrdemPagamentoRh[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await financeRhService.fetchOrdensRh();
      setOrdens(data);
    } catch (e) {
      console.error('Erro ao carregar ordens de RH:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnviarAprovacao = async (id: string) => {
    if (!confirm('¿Desea enviar esta orden de pago a revisión y aprobación de Finanzas?')) return;
    try {
      setIsProcessingAction(true);
      await financeRhService.enviarParaAprovacao(id);
      await loadData();
    } catch (err: any) {
      alert(`Error al enviar: ${err?.message || 'Compruebe su conexión'}`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  // KPIs
  const totalOrdens = ordens.length;
  const pendentesAprovacao = ordens.filter(o => {
    const st = (o.status || '').toLowerCase();
    return st === 'aguardando_aprovacao' || st === 'aguardando aprovação';
  });
  const pagas = ordens.filter(o => (o.status || '').toLowerCase() === 'pago');
  const totalValorPagas = pagas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  const totalValorPendentes = pendentesAprovacao.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);

  // Filtragem
  const filteredOrdens = ordens.filter(o => {
    const st = (o.status || '').toLowerCase();
    if (statusFilter === 'RASCUNHO' && st !== 'rascunho') return false;
    if (statusFilter === 'AGUARDANDO' && !(st.includes('aguardando') || st.includes('pendente'))) return false;
    if (statusFilter === 'PAGO' && st !== 'pago') return false;
    if (statusFilter === 'CANCELADO' && st !== 'cancelado') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchCod = (o.cod_orden_pago || '').toLowerCase().includes(term);
      const matchWorker = (o.worker_nome || '').toLowerCase().includes(term);
      const matchProvedor = (o.cod_provedor || '').toLowerCase().includes(term);
      const matchDesc = (o.descricao || '').toLowerCase().includes(term);
      const matchIban = (o.iban || '').toLowerCase().includes(term);
      return matchCod || matchWorker || matchProvedor || matchDesc || matchIban;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const st = (status || '').toLowerCase();
    if (st === 'pago') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          <CheckCircle2 size={12} />
          Pagado
        </span>
      );
    }
    if (st.includes('aguardando') || st.includes('pendente')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
          <Clock size={12} />
          Aguardando Aprobación
        </span>
      );
    }
    if (st === 'aprovado') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
          <CheckCircle2 size={12} />
          Aprobado
        </span>
      );
    }
    if (st === 'cancelado') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <AlertCircle size={12} />
          Cancelado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
        <FileText size={12} />
        Borrador (Rascunho)
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <Users size={14} className="text-blue-600" />
            <span>Recursos Humanos & Personal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            Órdenes de Pago — RH
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestione reconocimientos médicos, EPIs, anticipos salariales y reembolsos con flujo directo a Finanzas
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus size={16} />
            <span>Nueva Orden de Pago RH</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Órdenes RH</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
              <FileText size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {totalOrdens}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Registradas en el sistema</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pendientes Aprobación</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-xl">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {pendentesAprovacao.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            € {totalValorPendentes.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} en revisión
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pagadas / Liquidadas</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            € {totalValorPagas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{pagas.length} órdenes liquidadas por Finanzas</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Borradores Activos</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 rounded-xl">
              <Receipt size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600">
            {ordens.filter(o => (o.status || '').toLowerCase() === 'rascunho').length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Listos para despachar a Finanzas</p>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tabs de Status */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'TODAS', label: 'Todas' },
            { id: 'RASCUNHO', label: 'Borradores' },
            { id: 'AGUARDANDO', label: 'Aguardando Aprobación' },
            { id: 'PAGO', label: 'Pagadas' },
            { id: 'CANCELADO', label: 'Canceladas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input de Pesquisa */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            placeholder="Buscar por código OP, colaborador o motivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Tabela de Ordens */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
            Cargando órdenes de pago de Recursos Humanos...
          </div>
        ) : filteredOrdens.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <DollarSign size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No se encontraron órdenes de pago de RH
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Utilice el botón superior para crear una nueva orden de pago para exámenes médicos, EPIs, anticipos o reembolsos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Colaborador / Beneficiario</th>
                  <th className="px-4 py-3">Categoría / Concepto</th>
                  <th className="px-4 py-3">Vencimiento / Comp.</th>
                  <th className="px-4 py-3">Importe (€)</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-center">Comprobante</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredOrdens.map(op => {
                  const isRascunho = (op.status || '').toLowerCase() === 'rascunho';
                  const isPago = (op.status || '').toLowerCase() === 'pago';
                  const comprovanteFinal = op.comprovante_url || (isPago ? op.anexos : null);

                  return (
                    <tr key={op.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {op.cod_orden_pago}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {op.worker_nome || op.cod_provedor || 'Personal'}
                        </div>
                        {op.iban && (
                          <div className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                            {op.iban}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {op.tipo_orden || op.descricao}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]">
                          {op.centro_custos || 'Recursos Humanos'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{op.data_vencimento || '-'}</div>
                        {op.competencia && (
                          <span className="text-[10px] text-slate-400">Comp: {op.competencia}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                        € {Number(op.valor || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(op.status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {comprovanteFinal ? (
                          <a
                            href={comprovanteFinal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-[11px] font-bold transition-colors"
                            title="Descargar comprobante bancario"
                          >
                            <Download size={12} />
                            <span>Comprobante</span>
                          </a>
                        ) : op.anexos ? (
                          <a
                            href={op.anexos}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-[11px] font-bold transition-colors"
                            title="Ver documento adjunto"
                          >
                            <ExternalLink size={12} />
                            <span>Factura</span>
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isRascunho && (
                          <button
                            onClick={() => handleEnviarAprovacao(op.id)}
                            disabled={isProcessingAction}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition-colors"
                            title="Enviar a Finanzas para aprobación"
                          >
                            <Send size={11} />
                            <span>Enviar p/ Aprobación</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nova Ordem */}
      <NovaOrdemPagoRhModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
