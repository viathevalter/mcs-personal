import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchEstimaciones } from '../services/queries';
import type { Estimacion } from '../services/types';
import { Download, Filter as FilterIcon } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
export const Estimaciones: React.FC = () => {
  const { filters, setFilters } = useOutletContext<{ filters: any; setFilters: any }>();
  const [data, setData] = useState<Estimacion[]>([]);

  useEffect(() => {
    fetchEstimaciones(filters).then(setData);
  }, [filters]);

  const stages = ['Enviado', 'Negociación', 'Firmado', 'Convertido', 'Perdido'];

  // Calculate simple funnel stats
  const funnelStats = stages.map(stage => ({
    stage,
    count: data.filter(d => d.Etapa === stage).length,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Funil de Estimaciones</h2>
        <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
          <Download size={16} />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Funnel Visual */}
      <div className="grid grid-cols-5 gap-2">
        {funnelStats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 p-4 rounded-lg border-b-4 border-blue-500 shadow-sm text-center transition-colors">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{stat.stage}</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-2">{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Lista de Oportunidades</h3>
          <FilterIcon size={16} className="text-slate-400 dark:text-slate-500" />
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Título</th>
              <th className="px-6 py-3 font-medium">Cliente</th>
              <th className="px-6 py-3 font-medium">Data Criação</th>
              <th className="px-6 py-3 font-medium">Etapa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{row.Titulo}</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{row.Cliente}</td>
                <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{row.DataCriacao}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.Etapa === 'Convertido' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' :
                      row.Etapa === 'Perdido' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                        'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    }`}>
                    {row.Etapa}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
