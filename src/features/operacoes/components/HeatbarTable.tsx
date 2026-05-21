import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { RankItem } from '../services/types';
import { ChevronRight } from 'lucide-react';

interface HeatbarTableProps {
  title: string;
  items: RankItem[];
  maxValue?: number;
  linkPrefix?: string;
}

export const HeatbarTable: React.FC<HeatbarTableProps> = ({ title, items, maxValue, linkPrefix }) => {
  const navigate = useNavigate();
  const max = maxValue || Math.max(...items.map(i => i.value), 1);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm overflow-hidden flex flex-col h-full border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <table className="w-full">
          <tbody>
            {items.map((item, idx) => {
              const percentage = (item.value / max) * 100;
              return (
                <tr
                  key={item.id}
                  className={`group ${linkPrefix ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800' : ''}`}
                  onClick={() => linkPrefix && navigate(`${linkPrefix}/${item.id}`)}
                >
                  <td className="px-3 py-3 w-8 text-xs text-slate-400 dark:text-slate-500 font-mono">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.name}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{item.value}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 dark:bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </td>
                  {linkPrefix && (
                    <td className="w-8 px-2 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400">
                      <ChevronRight size={16} />
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-slate-400 dark:text-slate-600 text-sm">Nenhum dado encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
