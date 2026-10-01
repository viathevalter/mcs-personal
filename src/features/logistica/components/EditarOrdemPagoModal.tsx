import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, DollarSign, Calendar, Building, CreditCard } from 'lucide-react';
import type { PagoAlojamento } from '../services/financeLogisticsService';
import { financeLogisticsService } from '../services/financeLogisticsService';

interface EditarOrdemPagoModalProps {
  op: PagoAlojamento | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditarOrdemPagoModal: React.FC<EditarOrdemPagoModalProps> = ({
  op,
  isOpen,
  onClose,
  onSuccess
}) => {
  if (!isOpen || !op) return null;

  const [valor, setValor] = useState<number>(op.valor_previsto || 0);
  const [dataVencimento, setDataVencimento] = useState<string>(op.data_vencimento || '');
  const [competencia, setCompetencia] = useState<string>(op.periodo_competencia || '');
  const [provedorNome, setProvedorNome] = useState<string>(op.provedor_nome || '');
  const [iban, setIban] = useState<string>(op.iban_cobranca || '');
  const [banco, setBanco] = useState<string>(op.banco || '');
  const [titular, setTitular] = useState<string>(op.titular || '');
  const [clienteCC, setClienteCC] = useState<string>(op.centro_custo_cliente || '');
  const [obraCC, setObraCC] = useState<string>(op.centro_custo_obra || '');
  const [observacoes, setObservacoes] = useState<string>(op.observacoes || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (op) {
      setValor(op.valor_previsto || 0);
      setDataVencimento(op.data_vencimento || '');
      setCompetencia(op.periodo_competencia || '');
      setProvedorNome(op.provedor_nome || '');
      setIban(op.iban_cobranca || '');
      setBanco(op.banco || '');
      setTitular(op.titular || '');
      setClienteCC(op.centro_custo_cliente || '');
      setObraCC(op.centro_custo_obra || '');
      setObservacoes(op.observacoes || '');
    }
  }, [op]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (valor <= 0) {
      alert('Por favor, informe un importe válido mayor que cero.');
      return;
    }

    try {
      setIsSaving(true);
      await financeLogisticsService.atualizarOrdemPagamento(op.id, {
        valor,
        data_vencimento: dataVencimento,
        periodo_competencia: competencia,
        provedor_nome: provedorNome,
        iban_cobranca: iban,
        banco,
        titular,
        centro_custo_cliente: clienteCC,
        centro_custo_obra: obraCC,
        observacoes
      });

      alert('¡Orden de Pago actualizada con éxito!');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al actualizar OP:', err);
      alert(`Error al actualizar: ${err?.message || 'Compruebe la conexión'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Modificar Orden de Pago
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {op.codigo_pago} • {op.alojamento_nome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Valor e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <DollarSign size={13} className="text-emerald-500" />
                Importe Previsto (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={e => setValor(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar size={13} className="text-blue-500" />
                Fecha de Vencimiento <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={e => setDataVencimento(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Competência e Provedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Periodo / Competencia (MM/AAAA)
              </label>
              <input
                type="text"
                placeholder="10/2026"
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Building size={13} className="text-slate-400" />
                Proveedor / Propietario
              </label>
              <input
                type="text"
                value={provedorNome}
                onChange={e => setProvedorNome(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <CreditCard size={13} className="text-emerald-500" />
              Datos Bancarios
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                  IBAN
                </label>
                <input
                  type="text"
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  placeholder="ESXX..."
                  className="w-full px-2.5 py-1.5 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                  Banco
                </label>
                <input
                  type="text"
                  value={banco}
                  onChange={e => setBanco(e.target.value)}
                  placeholder="Santander, BBVA..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10px]">
                Titular de la Cuenta
              </label>
              <input
                type="text"
                value={titular}
                onChange={e => setTitular(e.target.value)}
                placeholder="Nombre del beneficiario"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Centros de Coste */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Cliente / Centro de Coste
              </label>
              <input
                type="text"
                value={clienteCC}
                onChange={e => setClienteCC(e.target.value)}
                placeholder="Cliente imputado"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                Obra
              </label>
              <input
                type="text"
                value={obraCC}
                onChange={e => setObraCC(e.target.value)}
                placeholder="Obra principal"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 dark:text-slate-300">
              Observaciones / Justificación de Cambios
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Detalles sobre este pago, ajustes realizados o aclaraciones para finanzas..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Footer Ações */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save size={14} />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
