import React, { useEffect, useState } from 'react';
import { DollarSign, FileSpreadsheet, Plus, Search, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { financeLogisticsService } from '../services/financeLogisticsService';
import type { PagoAlojamento } from '../services/financeLogisticsService';

export const FinanceiroLogisticaPage: React.FC = () => {
  const [pagos, setPagos] = useState<PagoAlojamento[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadPagos = async () => {
    setIsLoading(true);
    try {
      const data = await financeLogisticsService.fetchPagos();
      setPagos(data);
    } catch (err) {
      console.error('Erro ao carregar pagamentos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPagos();
  }, []);

  const filtered = pagos.filter(p =>
    (p.codigo_pago && p.codigo_pago.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.tipo_pago && p.tipo_pago.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={26} />
            Financeiro da Logística & Suministros
          </h1>
          <p className="text-sm text-slate-500">Acompanhamento de Ordens de Pagamento de aluguel, despesas (luz, água, internet) e fianças</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código ou tipo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando pagamentos...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum registro financeiro encontrado.</div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Código Pago</th>
                  <th className="px-4 py-3">Tipo Pago</th>
                  <th className="px-4 py-3">Competência</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Valor Previsto</th>
                  <th className="px-4 py-3">Status Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{p.codigo_pago}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        p.tipo_pago === 'Aluguel' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}>
                        {p.tipo_pago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.periodo_competencia || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.data_vencimento || 'N/A'}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">€ {p.valor_previsto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {p.status_pago}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
