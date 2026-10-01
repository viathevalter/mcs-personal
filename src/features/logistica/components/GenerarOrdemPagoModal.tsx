import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck,
  Calendar,
  DollarSign,
  Building,
  CreditCard,
  Users,
  Home,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { ContratoAlojamento } from '../services/contratosLogisticsService';
import { financeLogisticsService, type OcupanteInfo, type PagoAlojamento } from '../services/financeLogisticsService';
import { toast } from 'sonner';

interface GenerarOrdemPagoModalProps {
  contrato: ContratoAlojamento | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (opCriada: PagoAlojamento) => void;
  competenciaSugerida?: string;
}

export function calculateDefaultDates(diaContrato: number = 5, compSugerida?: string): {
  competencia: string;
  dataVencimento: string;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1 a 12
  const currentDay = now.getDate();

  // Competência padrão: Se nos primeiros 15 dias do mês, sugere o mês anterior (ex: 01/10 sugere 09/2026)
  let compMes = currentMonth - 1;
  let compAno = currentYear;
  if (compMes === 0) {
    compMes = 12;
    compAno = currentYear - 1;
  }

  const competencia = compSugerida && compSugerida.includes('/')
    ? compSugerida
    : `${String(compMes).padStart(2, '0')}/${compAno}`;

  // Vencimento: no mês ATUAL (ou no mês de pagamento correto) no dia pactuado no contrato
  const dia = Math.min(Math.max(diaContrato || 5, 1), 28);
  const diaStr = String(dia).padStart(2, '0');
  const mesVencStr = String(currentMonth).padStart(2, '0');
  const dataVencimento = `${currentYear}-${mesVencStr}-${diaStr}`;

  return { competencia, dataVencimento };
}

export const GenerarOrdemPagoModal: React.FC<GenerarOrdemPagoModalProps> = ({
  contrato,
  isOpen,
  onClose,
  onSuccess,
  competenciaSugerida
}) => {
  if (!isOpen || !contrato) return null;

  const defaults = calculateDefaultDates(contrato.dia_vencimento || 5, competenciaSugerida);

  const [competencia, setCompetencia] = useState<string>(defaults.competencia);
  const [dataVencimento, setDataVencimento] = useState<string>(defaults.dataVencimento);
  const [valor, setValor] = useState<number>(Number(contrato.valor_mensal) || 0);
  const [tipoPago, setTipoPago] = useState<PagoAlojamento['tipo_pago']>('Aluguel');
  const [clienteCC, setClienteCC] = useState<string>(contrato.cliente_nome || 'Centro de Coste General');
  const [obraCC, setObraCC] = useState<string>(contrato.centro_custo_obra || `Obra ${contrato.alojamento?.municipio || 'Principal'}`);
  const [provedorNome, setProvedorNome] = useState<string>(contrato.provedor_nome || '');
  const [titular, setTitular] = useState<string>(contrato.titular || contrato.provedor_nome || '');
  const [iban, setIban] = useState<string>(contrato.iban_cobranca || '');
  const [banco, setBanco] = useState<string>(contrato.banco || '');
  const [observacoes, setObservacoes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ocupantes dinâmicos
  const [ocupantes, setOcupantes] = useState<OcupanteInfo[]>([]);
  const [isLoadingOcupantes, setIsLoadingOcupantes] = useState(false);

  useEffect(() => {
    if (contrato) {
      const d = calculateDefaultDates(contrato.dia_vencimento || 5, competenciaSugerida);
      setCompetencia(d.competencia);
      setDataVencimento(d.dataVencimento);
      setValor(Number(contrato.valor_mensal) || 0);
      setClienteCC(contrato.cliente_nome || 'Centro de Coste General');
      setObraCC(contrato.centro_custo_obra || `Obra ${contrato.alojamento?.municipio || 'Principal'}`);
      setProvedorNome(contrato.provedor_nome || '');
      setTitular(contrato.titular || contrato.provedor_nome || '');
      setIban(contrato.iban_cobranca || '');
      setBanco(contrato.banco || '');

      setObservacoes(
        `Alquiler mensual del contrato ${contrato.codigo} (${contrato.alojamento_nome}) - ${contrato.tipo_contrato} - Competencia: ${d.competencia}`
      );

      // Carregar ocupantes dinâmicos atuais do imóvel
      setIsLoadingOcupantes(true);
      financeLogisticsService
        .fetchOcupantesAlojamento(contrato.alojamento?.codigo || contrato.alojamento_id, contrato.alojamento_nome)
        .then(res => setOcupantes(res))
        .catch(err => {
          console.warn('Erro ao carregar ocupantes:', err);
          setOcupantes([]);
        })
        .finally(() => setIsLoadingOcupantes(false));
    }
  }, [contrato, competenciaSugerida]);

  // Atualizar texto de observações se competência mudar
  const handleCompetenciaChange = (newComp: string) => {
    setCompetencia(newComp);
    setObservacoes(prev => {
      if (prev.includes('Competencia:')) {
        return prev.replace(/Competencia:\s*[0-9\/]+/, `Competencia: ${newComp}`);
      }
      return `${prev} - Competencia: ${newComp}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valor <= 0) {
      toast.error('Informe um valor válido maior que zero.');
      return;
    }
    if (!dataVencimento) {
      toast.error('Informe a data de vencimento da ordem.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        contrato_id: contrato.codigo,
        alojamento_id: contrato.alojamento_id,
        alojamento_nome: contrato.alojamento_nome,
        alojamento_codigo: contrato.alojamento?.codigo,
        provedor_id: contrato.provedor_id,
        provedor_nome: provedorNome,
        iban_cobranca: iban,
        banco,
        titular,
        centro_custo_cliente: clienteCC,
        centro_custo_obra: obraCC,
        tipo_pago: tipoPago,
        valor: Number(valor),
        data_vencimento: dataVencimento,
        periodo_competencia: competencia,
        observacoes
      };

      const opCriada = await financeLogisticsService.gerarOrdemPagamento(payload);

      toast.success(`🎉 Ordem de Pagamento ${opCriada.codigo_pago} gerada como Rascunho!`, {
        description: `Competência ${competencia} com vencimento para ${new Date(dataVencimento + 'T12:00:00').toLocaleDateString('es-ES')}`
      });

      onSuccess(opCriada);
      onClose();
    } catch (err: any) {
      console.error('Erro ao gerar OP:', err);
      toast.error(`Falha ao gerar Ordem de Pagamento: ${err?.message || 'Verifique a conexão.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Botões de atalho rápido de competência
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const compPassada = `${String(prevMonth).padStart(2, '0')}/${prevYear}`;
  const compAtual = `${String(currentMonth).padStart(2, '0')}/${currentYear}`;

  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const compFutura = `${String(nextMonth).padStart(2, '0')}/${nextYear}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Generar Orden de Pago (Borrador)
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Rascunho
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                {contrato.alojamento_nome} • Contrato: <strong className="font-mono text-slate-700 dark:text-slate-300">{contrato.codigo}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Card explicativo de Regra de Negócio: Competência vs Vencimento */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl flex items-start gap-2.5">
            <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>Control de Fechas:</strong> La <strong>Competencia</strong> indica el mes de ocupación/servicio del inmueble (ej: <em>{competencia}</em>). La <strong>Fecha de Vencimiento</strong> es el día exacto en que Finanzas debe realizar la transferencia (ej: <em>{dataVencimento || 'Seleccione fecha'}</em>).
            </div>
          </div>

          {/* Grid: Competência e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            {/* Competência */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Competencia (Mes / Año) *
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={competencia}
                  onChange={e => handleCompetenciaChange(e.target.value)}
                  placeholder="09/2026"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: `Mes anterior (${compPassada})`, val: compPassada },
                    { label: `Mes actual (${compAtual})`, val: compAtual },
                    { label: `Mes siguiente (${compFutura})`, val: compFutura }
                  ].map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleCompetenciaChange(item.val)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                        competencia === item.val
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      {item.val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Fecha de Vencimiento de Pago *
              </label>
              <div className="space-y-1.5">
                <input
                  type="date"
                  value={dataVencimento}
                  onChange={e => setDataVencimento(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Día pactado en contrato: <strong>Día {contrato.dia_vencimento || 5}</strong> de cada mes.
                </p>
              </div>
            </div>
          </div>

          {/* Grid: Valor e Tipo de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Importe Previsto (€) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">€</span>
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={e => setValor(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Importe mensual base del contrato: € {Number(contrato.valor_mensal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Concepto / Tipo de Pago *
              </label>
              <select
                value={tipoPago}
                onChange={e => setTipoPago(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Aluguel">Alquiler Mensual (Aluguel)</option>
                <option value="Fianza_Saida">Fianza de Entrada / Depósito</option>
                <option value="Suministro_Luz">Suministro - Electricidad / Luz</option>
                <option value="Suministro_Agua">Suministro - Agua</option>
                <option value="Suministro_Gas">Suministro - Gas</option>
                <option value="Suministro_Internet">Suministro - Internet / Wifi</option>
                <option value="Manutencao_Limpeza">Mantenimiento / Limpieza / Reparación</option>
              </select>
            </div>
          </div>

          {/* Dados Bancários & Provedor */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900/60">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <CreditCard size={14} className="text-emerald-600" />
              Beneficiario y Datos Bancarios
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Proveedor / Propietario</label>
                <input
                  type="text"
                  value={provedorNome}
                  onChange={e => setProvedorNome(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Titular de la Cuenta</label>
                <input
                  type="text"
                  value={titular}
                  onChange={e => setTitular(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">IBAN de Cobro</label>
                <input
                  type="text"
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  placeholder="ESXX XXXX XXXX XXXX XXXX"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs font-bold text-slate-800 dark:text-slate-200 outline-none tracking-wider"
                />
              </div>
            </div>
          </div>

          {/* Ocupantes Dinâmicos Vinculados */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-50/60 dark:bg-slate-800/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Users size={14} className="text-blue-600" />
                Personal Alojado en el Inmueble ({ocupantes.length} ocupantes activos)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {isLoadingOcupantes ? 'Cargando...' : 'Sincronizado con Logística'}
              </span>
            </div>

            {isLoadingOcupantes ? (
              <p className="text-slate-400 text-center py-2 text-xs">Cargando ocupantes...</p>
            ) : ocupantes.length > 0 ? (
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900">
                {ocupantes.map((oc, idx) => (
                  <div key={oc.worker_id || idx} className="p-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold">
                        {oc.worker_nome?.charAt(0) || 'W'}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{oc.worker_nome}</span>
                      <span className="font-mono text-[10px] text-slate-400">[{oc.codigo_colab || 'S/C'}]</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-[180px]">
                      {oc.obra_nome || oc.cliente_nome || 'Obra Principal'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-2 text-[11px]">
                Ningún trabajador alocado actualmente en este alojamiento.
              </p>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Observaciones de la Orden
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all shadow-md shadow-emerald-600/20 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <FileCheck size={16} />
              {isSubmitting ? 'Generando Orden...' : 'Confirmar y Generar OP (Borrador)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
