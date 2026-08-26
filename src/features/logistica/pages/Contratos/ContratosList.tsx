import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  DollarSign,
  Building,
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
  X
} from 'lucide-react';
import { contratosLogisticsService } from '../../services/contratosLogisticsService';
import type { ContratoAlojamento } from '../../services/contratosLogisticsService';
import { financeLogisticsService } from '../../services/financeLogisticsService';

export const ContratosList: React.FC = () => {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState<ContratoAlojamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
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

  const handleGerarOP = async (contrato: ContratoAlojamento) => {
    try {
      setGeneratingOpId(contrato.id);

      let vencimento = '2026-09-05';
      if (contrato.data_inicio) {
        const cleanDate = contrato.data_inicio.replace(/\./g, '-');
        const parts = cleanDate.split('-');
        if (parts.length >= 2) {
          const day = String(contrato.dia_vencimento || 5).padStart(2, '0');
          vencimento = `${parts[0]}-${parts[1]}-${day}`;
        }
      }

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
        centro_custo_cliente: 'BECK & POLLITZER IBERICA SLU',
        centro_custo_obra: `Obra ${contrato.alojamento?.municipio || 'Principal'}`,
        tipo_pago: 'Aluguel',
        valor: Number(contrato.valor_mensal) || 0,
        data_vencimento: vencimento,
        periodo_competencia: '09/2026',
        observacoes: `Alquiler mensual del contrato ${contrato.codigo} (${contrato.alojamento_nome})`
      });

      alert(`✅ ¡Orden de Pago ${opCriada.codigo_pago} generada con éxito para el inmueble ${contrato.alojamento_nome}! Puede visualizarla y enviarla a aprobación en la pantalla de Órdenes de Pago.`);
    } catch (err: any) {
      console.error('Error al generar OP:', err);
      alert(`Aviso: ${err?.message || 'No fue posible generar la Orden de Pago. Compruebe los datos del contrato.'}`);
    } finally {
      setGeneratingOpId(null);
    }
  };

  // Métricas Consolidadas dos Contratos
  const totalContratos = contratos.length;
  const contratosAtivos = contratos.filter(c => c.status === 'Activo').length;
  const valorTotalMensal = contratos
    .filter(c => c.status === 'Activo')
    .reduce((acc, c) => acc + (Number(c.valor_mensal) || 0), 0);
  const totalFiancasCustodia = contratos
    .filter(c => c.status === 'Activo')
    .reduce((acc, c) => acc + (Number(c.fianza_valor) || 0), 0);

  const filtered = contratos.filter(c => {
    const matchesSearch =
      (c.codigo && c.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.alojamento_nome && c.alojamento_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.provedor_nome && c.provedor_nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.iban_cobranca && c.iban_cobranca.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'ativos') return c.status === 'Activo';
    if (statusFilter === 'com_fianca') return Number(c.fianza_valor) > 0;
    return true;
  });

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
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Contratos de Arrendamiento & Fianzas
              </h1>
              <p className="text-xs text-slate-500">
                Gestión contractual directa vinculada a los inmuebles, seguimiento de garantías e integración financiera
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/logistica/registros/alojamentos/novo')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nuevo Alojamiento & Contrato
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Contratos Activos</span>
            <Building size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {contratosAtivos} <span className="text-xs font-normal text-slate-400">/ {totalContratos} total</span>
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} />
            100% integrados a los inmuebles
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Coste Total Arrendamiento</span>
            <DollarSign size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            € {valorTotalMensal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 font-medium">
            Media de € {contratosAtivos > 0 ? (valorTotalMensal / contratosAtivos).toFixed(0) : 0}/inmueble/mes
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Fianzas en Custodia</span>
            <ShieldCheck size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
            € {totalFiancasCustodia.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-amber-600 font-semibold">
            📌 Depósitos para devolución post-inspección
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Órdenes de Pago</span>
            <TrendingUp size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            Listas p/ Envío
          </p>
          <span className="text-[11px] text-purple-600 font-semibold">
            Generación de OP en 1 clic
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filters and Search */}
        <div className="p-4 bg-slate-50/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative w-72 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar por código, alojamiento, proveedor o IBAN..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('todos')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'todos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              Todos ({contratos.length})
            </button>
            <button
              onClick={() => setStatusFilter('ativos')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'ativos'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              Activos ({contratosAtivos})
            </button>
            <button
              onClick={() => setStatusFilter('com_fianca')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'com_fianca'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
              }`}
            >
              Con Fianza ({contratos.filter(c => Number(c.fianza_valor) > 0).length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              Cargando contratos de alojamientos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <FileText size={32} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Ningún contrato encontrado</p>
              <p className="text-xs text-slate-400">Registre nuevos alojamientos para generar los contratos de arrendamiento automáticamente.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Contrato & Inmueble</th>
                  <th className="px-4 py-3">Proveedor / Titular</th>
                  <th className="px-4 py-3">Modalidad</th>
                  <th className="px-4 py-3">Vigencia & Vencimiento</th>
                  <th className="px-4 py-3">Alquiler Mensual</th>
                  <th className="px-4 py-3">Fianza (Garantía)</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones Financieras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setViewingContrato(c)}
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Código e Alojamento */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:scale-105 transition-transform">
                          <Home size={15} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                              {c.codigo}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-semibold">
                              {c.alojamento?.codigo || 'AL-XXXX'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                            {c.alojamento_nome}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Provedor & IBAN */}
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 text-xs">{c.provedor_nome}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.iban_cobranca ? (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] text-slate-500">
                              {c.iban_cobranca.slice(0, 10)}...{c.iban_cobranca.slice(-4)}
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
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {c.tipo_contrato}
                      </span>
                    </td>

                    {/* Vigência */}
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium">
                          {c.data_inicio ? c.data_inicio : 'Inicio N/D'}
                          {c.data_fim ? ` → ${c.data_fim}` : ' (Indeterminado)'}
                        </p>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          Vencimiento: Día {c.dia_vencimento}
                        </span>
                      </div>
                    </td>

                    {/* Valor Mensal */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        € {c.valor_mensal?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Fiança */}
                    <td className="px-4 py-3.5">
                      {c.fianza_valor > 0 ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-amber-700 dark:text-amber-400">
                            € {c.fianza_valor?.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            {c.fianza_meses} mes(es) garantía
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Sin fianza</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleGerarOP(c)}
                          disabled={generatingOpId === c.id}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                          title="Generar Orden de Pago en Finanzas"
                        >
                          <DollarSign size={13} />
                          {generatingOpId === c.id ? 'Generando...' : 'Generar OP'}
                        </button>

                        <button
                          onClick={() => navigate(`/logistica/registros/alojamentos/editar/${c.alojamento_id}`)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Editar Alojamiento & Contrato"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Modalidad</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{viewingContrato.tipo_contrato}</span>
                </div>
                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase block">Alquiler Mensual</span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300 text-base">
                    € {viewingContrato.valor_mensal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
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
                    : 'Sin exigencia de fianza (Airbnb / Booking / Hotel)'}
                </p>
                <p className="text-[11px] text-amber-800 dark:text-amber-400">
                  📌 Este importe se contabiliza para control de inspección de check-out y devolución al finalizar el alquiler.
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
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Generar OP Alquiler
                </button>
                <button
                  onClick={() => {
                    const alojId = viewingContrato.alojamento_id;
                    setViewingContrato(null);
                    navigate(`/logistica/registros/alojamentos/editar/${alojId}`);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  Editar Alojamiento & Contrato
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
