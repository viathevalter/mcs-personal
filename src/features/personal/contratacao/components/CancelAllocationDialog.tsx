import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface CancelAllocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  workerName: string;
  isPending: boolean;
}

export const CancelAllocationDialog: React.FC<CancelAllocationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  workerName,
  isPending
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden flex flex-col">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-455" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cancelar Contratação</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Esta ação reabrirá a vaga no pedido.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-lg border border-slate-100 dark:border-slate-850/30 text-xs text-slate-600 dark:text-slate-400">
            Tem certeza de que deseja cancelar a alocação de <strong>{workerName}</strong>? Ele será marcado com o status <strong>Desistiu</strong> em seu cadastro e as vagas associadas serão liberadas.
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
              Motivo do Cancelamento / Desistência <span className="text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none resize-none text-xs"
              placeholder="Ex: Trabalhador não aceitou os termos do contrato, desistiu por motivos pessoais, etc..."
              disabled={isPending}
            />
          </div>

          {/* Rodapé de Ações */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-250 dark:border-slate-700"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
