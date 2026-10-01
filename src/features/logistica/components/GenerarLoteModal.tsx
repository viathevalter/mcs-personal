import React, { useState } from 'react';
import {
  X,
  Zap,
  Calendar,
  DollarSign,
  Building,
  CheckCircle2,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { ContratoAlojamento } from '../services/contratosLogisticsService';
import { financeLogisticsService } from '../services/financeLogisticsService';
import { toast } from 'sonner';

interface GenerarLoteModalProps {
  contratos: ContratoAlojamento[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  competenciaInicial?: string;
}

export const GenerarLoteModal: React.FC<GenerarLoteModalProps> = ({
  contratos,
  isOpen,
  onClose,
  onSuccess,
  competenciaInicial
}) => {
  if (!isOpen || contratos.length === 0) return null;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Competência padrão: Mês anterior se estamos no início do mês
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
  const defaultComp = competenciaInicial || `${String(prevMonth).padStart(2, '0')}/${prevYear}`;

  const [competencia, setCompetencia] = useState<string>(defaultComp);
  const [mesVencimento, setMesVencimento] = useState<string>(
    `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  );
  const [usarDiaContrato, setUsarDiaContrato] = useState<boolean>(true);
  const [dataFixaVencimento, setDataFixaVencimento] = useState<string>(
    `${currentYear}-${String(currentMonth).padStart(2, '0')}-05`
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const totalValor = contratos.reduce((sum, c) => sum + (Number(c.valor_mensal) || 0), 0);

  // Calcula a data de vencimento de um contrato específico
  const getVencimentoForContrato = (c: ContratoAlojamento): string => {
    if (!usarDiaContrato) {
      return dataFixaVencimento;
    }
    const dia = Math.min(Math.max(c.dia_vencimento || 5, 1), 28);
    const diaStr = String(dia).padStart(2, '0');
    return `${mesVencimento}-${diaStr}`;
  };

  const handleConfirmarLote = async () => {
    try {
      setIsSubmitting(true);

      const payloads = contratos.map(c => {
        const vencimento = getVencimentoForContrato(c);
        return {
          contrato_id: c.codigo,
          alojamento_id: c.alojamento_id,
          alojamento_nome: c.alojamento_nome,
          alojamento_codigo: c.alojamento?.codigo,
          provedor_id: c.provedor_id,
          provedor_nome: c.provedor_nome,
          iban_cobranca: c.iban_cobranca,
          banco: c.banco,
          titular: c.titular,
          centro_custo_cliente: c.cliente_nome || 'Centro de Coste General',
          centro_custo_obra: c.centro_custo_obra || `Obra ${c.alojamento?.municipio || 'Principal'}`,
          tipo_pago: 'Aluguel' as const,
          valor: Number(c.valor_mensal) || 0,
          data_vencimento: vencimento,
          periodo_competencia: competencia,
          observacoes: `Alquiler mensual lote ${competencia} - ${c.alojamento_nome}`
        };
      });

      const opsCriadas = await financeLogisticsService.gerarOrdensPagamentoEmLote(payloads);

      toast.success(`🎉 ${opsCriadas.length} Órdenes de Pago generadas como Borrador!`, {
        description: `Competencia ${competencia} registradas en Finanzas.`
      });

      onSuccess(opsCriadas.length);
      onClose();
    } catch (err: any) {
      console.error('Error al generar lote:', err);
      toast.error(`Error al generar lote: ${err?.message || 'Compruebe la conexión.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl max-h-[92vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Generar Órdenes de Pago en Lote
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {contratos.length} Contratos
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Importe Total: <strong className="text-emerald-600 dark:text-emerald-400 font-black">€ {totalValor.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Card informativo de Competência vs Vencimento */}
          <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl flex items-start gap-2.5">
            <Info size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
              <strong>Emisión Masiva:</strong> Todas las órdenes se crearán en estado <strong>Borrador (Rascunho)</strong>. Podrá revisarlas y enviarlas a aprobación en Finanzas.
            </div>
          </div>

          {/* Configuração de Competência e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            {/* Competência do Lote */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Competencia de los Alquileres *
              </label>
              <input
                type="text"
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                placeholder="09/2026"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Mes del período de servicio/alojamiento
              </p>
            </div>

            {/* Mês de Pagamento / Vencimento */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mes de Pago / Vencimiento *
              </label>
              <input
                type="month"
                value={mesVencimento}
                onChange={e => setMesVencimento(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Mes en que Finanzas liquidará las órdenes
              </p>
            </div>
          </div>

          {/* Opção de Vencimento: Por dia pactuado ou data fixa */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="font-bold text-slate-900 dark:text-white block text-[11px] uppercase tracking-wider">
              Regla de Fecha de Vencimiento
            </span>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="modo_vencimento"
                  checked={usarDiaContrato}
                  onChange={() => setUsarDiaContrato(true)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  <strong>Respetar el día pactado en cada contrato</strong> (Ej: contratos con día 5 vencerán el {mesVencimento}-05)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="modo_vencimento"
                  checked={!usarDiaContrato}
                  onChange={() => setUsarDiaContrato(false)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300">
                  <strong>Fijar la misma fecha de vencimiento para todos:</strong>
                </span>
              </label>
              {!usarDiaContrato && (
                <div className="ml-6 pt-1">
                  <input
                    type="date"
                    value={dataFixaVencimento}
                    onChange={e => setDataFixaVencimento(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 text-xs outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Pré-visualização da lista de ordens a gerar */}
          <div className="space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block text-[11px] uppercase tracking-wider">
              Vista Previa de Órdenes a Generar ({contratos.length})
            </span>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
              {contratos.map(c => {
                const venc = getVencimentoForContrato(c);
                return (
                  <div key={c.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{c.alojamento_nome}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {c.codigo} • Prov: {c.provedor_nome || 'Propietario'}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-black text-slate-900 dark:text-white block">
                        € {Number(c.valor_mensal).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                        Vence: {new Date(venc + 'T12:00:00').toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
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
              type="button"
              onClick={handleConfirmarLote}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black transition-all shadow-md shadow-emerald-600/20 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <Zap size={16} />
              {isSubmitting ? 'Generando Lote...' : `Confirmar y Generar ${contratos.length} Órdenes (Borrador)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
