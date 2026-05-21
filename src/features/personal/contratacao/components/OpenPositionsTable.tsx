import React from 'react';
import type { OpenPosition } from '../hooks/useOpenPositions';
import { Briefcase, Building, Users } from 'lucide-react';

interface OpenPositionsTableProps {
  positions: OpenPosition[];
  onAllocate: (position: OpenPosition) => void;
}

export const OpenPositionsTable: React.FC<OpenPositionsTableProps> = ({ positions, onAllocate }) => {
  if (positions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Briefcase className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">Nenhuma vaga em aberto</h3>
        <p className="text-slate-500 dark:text-slate-400">Todos os pedidos ativos já foram preenchidos.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Pedido</th>
              <th className="px-6 py-4 font-medium">Cliente / Obra</th>
              <th className="px-6 py-4 font-medium">Função</th>
              <th className="px-6 py-4 font-medium text-center">Data Prevista</th>
              <th className="px-6 py-4 font-medium text-center">Vagas (Solicitadas / Preenchidas)</th>
              <th className="px-6 py-4 font-medium text-center">Saldo</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {positions.map((pos) => (
              <tr key={pos.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900 dark:text-white">{pos.pedido_codigo}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                      <Building className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{pos.client_name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{pos.site_name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                  {pos.job_function_name}
                </td>
                <td className="px-6 py-4 text-center text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {pos.expected_start_date ? new Date(pos.expected_start_date).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-medium text-slate-900 dark:text-white">{pos.quantity_requested}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-emerald-600 font-medium">{pos.quantity_fulfilled}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                    {pos.quantity_requested - pos.quantity_fulfilled}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onAllocate(pos)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <Users size={16} />
                    Alocar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
