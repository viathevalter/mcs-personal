import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus,
  Users,
  Sparkles,
  Bell,
  FileText,
  Megaphone,
  FileSpreadsheet,
  ArrowLeft,
  Menu,
  Briefcase,
} from 'lucide-react';
import { Header } from '@/features/operacoes/components/Header';
import { SidebarProvider, useSidebar } from '@/features/operacoes/contexts/SidebarContext';
import { AuthProvider } from '@/features/operacoes/contexts/AuthContext';
import { contratacaoRecruitmentService } from '../services/contratacaoRecruitmentService';

const ContratacaoSidebar: React.FC = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  // Buscar contagem de Novas Baixas do RH para exibir no badge do menu lateral
  const { data: inactiveWorkers = [] } = useQuery({
    queryKey: ['contratacao_inactive_workers_history'],
    queryFn: () => contratacaoRecruitmentService.fetchInactiveWorkersWithHistory(),
    staleTime: 1000 * 60 * 2,
  });

  const newBaixasCount = inactiveWorkers.filter(w => w.is_new_baixa).length;

  const NavItem = ({
    to,
    icon: Icon,
    label,
    badgeCount,
    badgeColor,
  }: {
    to: string;
    icon: React.ElementType;
    label: string;
    badgeCount?: number;
    badgeColor?: string;
  }) => (
    <NavLink
      to={to}
      title={!isSidebarOpen ? label : ''}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-emerald-600/10 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-semibold'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        } ${!isSidebarOpen && 'justify-center'}`
      }
    >
      <div className="flex items-center space-x-3 min-w-0">
        <Icon size={18} className="group-hover:scale-105 transition-transform duration-200 flex-shrink-0" />
        {isSidebarOpen && <span className="text-sm truncate">{label}</span>}
      </div>
      {isSidebarOpen && badgeCount != null && badgeCount > 0 && (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            badgeColor || 'bg-rose-600 text-white animate-pulse'
          }`}
        >
          {badgeCount}
        </span>
      )}
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
    <aside
      className={`${
        isSidebarOpen ? 'w-64' : 'w-20'
      } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen fixed left-0 top-0 flex flex-col z-20 overflow-y-auto overflow-x-hidden transition-all duration-300`}
    >
      <div
        className={`p-5 flex items-center mb-2 ${
          isSidebarOpen ? 'justify-between' : 'justify-center flex-col gap-2'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-600/20">
            <UserPlus size={20} />
          </div>
          {isSidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                MCS Contratação
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                Captação, Entrevistas & Vagas
              </p>
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
          {isSidebarOpen && 'Voltar para o Hub'}
        </button>
      </div>

      <div className="flex-1 px-3 py-2">
        <SectionLabel label="Operação de Vagas" />
        <div className="space-y-1">
          <NavItem to="/contratacao/vagas" icon={Briefcase} label="Contratação Inicial" />
          <NavItem to="/contratacao/entrevistas" icon={Sparkles} label="Controle de Entrevistas" />
          <NavItem
            to="/contratacao/baixas-radar"
            icon={Bell}
            label="Radar de Baixas & Na Manga"
            badgeCount={newBaixasCount}
          />
        </div>

        <SectionLabel label="Captação & Divulgação" />
        <div className="space-y-1">
          <NavItem
            to="/contratacao/curriculos"
            icon={FileText}
            label="Banco de Currículos (+4.444)"
          />
          <NavItem
            to="/contratacao/divulgacao"
            icon={Megaphone}
            label="Divulgar Vagas (WA / FB)"
          />
        </div>

        <SectionLabel label="Gestão & Histórico" />
        <div className="space-y-1">
          <NavItem to="/contratacao/alocados" icon={Users} label="Trabalhadores Alocados" />
          <NavItem
            to="/contratacao/relatorio"
            icon={FileSpreadsheet}
            label="Controle de Contratações"
          />
        </div>
      </div>
    </aside>
  );
};

const ContratacaoContent: React.FC = () => {
  const { isSidebarOpen } = useSidebar();
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [filters, setFilters] = useState({
    monthRange: [currentMonth, currentMonth] as [string, string],
    empresa: null,
    comercial: null,
    cliente: null,
    status: null,
    pais: null,
  });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <ContratacaoSidebar />
      <main
        className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <Header />
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 lg:p-8">
          <Outlet context={{ filters, setFilters }} />
        </div>
      </main>
    </div>
  );
};

export const ContratacaoLayout: React.FC = () => {
  return (
    <AuthProvider>
      <SidebarProvider>
        <ContratacaoContent />
      </SidebarProvider>
    </AuthProvider>
  );
};
