import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Box, FileText, History, ArrowLeft, Menu, LayoutDashboard, Activity } from 'lucide-react';
import { useLanguage } from '../../operacoes/i18n';
import { useSidebar } from '@/features/operacoes/contexts/SidebarContext';

export const Sidebar: React.FC = () => {
  const { t } = useLanguage();
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const NavItem = ({ to, icon: Icon, label }: any) => (
    <NavLink
      to={to}
      title={!isSidebarOpen ? label : ''}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
          ? 'bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-medium'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        } ${!isSidebarOpen && 'justify-center'}`
      }
    >
      <Icon size={18} className="group-hover:scale-105 transition-transform duration-200 flex-shrink-0" />
      {isSidebarOpen && <span className="text-sm truncate">{label}</span>}
    </NavLink>
  );

  const SectionLabel = ({ label }: { label: string }) => (
    <div className={`px-3 mb-2 mt-6 ${!isSidebarOpen && 'text-center'}`}>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
        {isSidebarOpen ? label : '• • •'}
      </p>
    </div>
  );

  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen fixed left-0 top-0 flex flex-col z-20 overflow-y-auto overflow-x-hidden transition-all duration-300`}>
      <div className={`p-5 flex items-center mb-2 ${isSidebarOpen ? 'justify-between' : 'justify-center flex-col gap-2'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-600/20">
            <Box size={20} />
          </div>
          {isSidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">Faturamento</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">Módulo de Faturamento</p>
            </div>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
        >
          <Menu size={18} />
        </button>
      </div>

      <div className="px-3 mb-2">
        <button 
          onClick={() => navigate('/hub')}
          className="w-full flex items-center gap-2 justify-center py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-700"
        >
          <ArrowLeft size={16} />
          {isSidebarOpen && "Voltar para o Hub"}
        </button>
      </div>

      <div className="flex-1 px-3 py-2">
        <SectionLabel label="Gestão" />
        <div className="space-y-1">
          <NavItem to="/faturamento/dashboard" icon={LayoutDashboard} label="Painel" />
          <NavItem to="/faturamento/pendentes" icon={FileText} label="Operacional" />
          <NavItem to="/faturamento/tracking" icon={Activity} label="Tracking" />
          <NavItem to="/faturamento/historico" icon={History} label="Histórico" />
        </div>
      </div>
    </aside>
  );
};
