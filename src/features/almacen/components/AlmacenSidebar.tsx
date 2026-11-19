import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  PackageSearch,
  ClipboardList,
  PackageCheck,
  Boxes,
  ArrowLeft,
  Menu,
  Smartphone,
  RefreshCcw,
  HardHat,
  ShieldCheck,
  Ruler,
} from 'lucide-react';
import { useSidebar } from '@/features/operacoes/contexts/SidebarContext';

export const AlmacenSidebar: React.FC = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => (
    <NavLink
      to={to}
      title={!isSidebarOpen ? label : ''}
      className={({ isActive }) =>
        `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-emerald-600/10 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-medium'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        } ${!isSidebarOpen && 'justify-center'}`
      }
    >
      <Icon size={18} className="group-hover:scale-105 transition-transform duration-200 flex-shrink-0" />
      {isSidebarOpen && <span className="text-sm truncate">{label}</span>}
    </NavLink>
  );

  const SectionLabel = ({ label }: { label: string }) => (
    <div className={`px-3 mb-2 mt-4 ${!isSidebarOpen && 'text-center'}`}>
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
      <div className={`p-5 flex items-center mb-2 ${isSidebarOpen ? 'justify-between' : 'justify-center flex-col gap-2'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-600/20">
            <PackageSearch size={20} />
          </div>
          {isSidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                MCS Almacén
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                EPIs, Dotación & Stock
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
          {isSidebarOpen && 'Volver al Hub'}
        </button>
      </div>

      <div className="flex-1 px-3 py-2 space-y-4">
        <div>
          <SectionLabel label="Operación & Despachos" />
          <div className="space-y-1">
            <NavItem to="/almacen/demandas" icon={ClipboardList} label="Demandas por Pedido" />
            <NavItem to="/almacen/reposicao" icon={RefreshCcw} label="Reposições & Histórico" />
            <NavItem to="/almacen/ordenes" icon={PackageCheck} label="Órdenes de Separación" />
          </div>
        </div>

        <div>
          <SectionLabel label="Inventario & Catálogo" />
          <div className="space-y-1">
            <NavItem to="/almacen/estoque" icon={Boxes} label="Stock & Mínimos" />
            <NavItem to="/almacen/catalogo-epis" icon={HardHat} label="Catálogo de EPIs" />
            <NavItem to="/almacen/kits-perfis" icon={ShieldCheck} label="Kits por Perfil" />
            <NavItem to="/almacen/tamanhos" icon={Ruler} label="Grade de Tamanhos" />
          </div>
        </div>

        <div>
          <SectionLabel label="Operador Móvil (Fase 2)" />
          <div className="space-y-1">
            <NavItem to="/almacen/ordenes" icon={Smartphone} label="Vista Picking Móvil" />
          </div>
        </div>
      </div>
    </aside>
  );
};
