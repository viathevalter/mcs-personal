import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PieChart, FileText, Wallet, Settings, ArrowLeft } from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <div className="w-64 bg-brand-dark text-white flex flex-col h-screen fixed left-0 top-0 overflow-y-auto z-20">
      <div className="p-6 flex items-center gap-3 border-b border-gray-700">
        <div className="w-10 h-10 bg-brand-action rounded-lg flex items-center justify-center font-bold text-xl">M</div>
        <span className="font-bold text-lg tracking-tight">Mastercorp</span>
      </div>

      <div className="px-4 pt-4">
        <button 
          onClick={() => navigate('/hub')}
          className="w-full flex items-center gap-2 justify-center py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-sm font-medium border border-slate-700"
        >
          <ArrowLeft size={16} />
          Voltar para o Hub
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-2">
        <Link to="/financeiro/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/financeiro/dashboard') ? 'bg-white/10 text-brand-action font-medium' : 'text-gray-300 hover:bg-white/5'}`}>
          <LayoutDashboard size={20} />
          Dashboard
        </Link>
        <Link to="/financeiro/analises" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/financeiro/analises') ? 'bg-white/10 text-brand-action font-medium' : 'text-gray-300 hover:bg-white/5'}`}>
          <PieChart size={20} />
          Análises
        </Link>
        <Link to="/financeiro/titulos" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/financeiro/titulos') ? 'bg-white/10 text-brand-action font-medium' : 'text-gray-300 hover:bg-white/5'}`}>
          <FileText size={20} />
          Títulos
        </Link>

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-gray-500 uppercase">Operacional</div>

        <div className="relative group opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400">
            <Wallet size={20} />
            Cobrança Pro
          </div>
          <span className="absolute right-2 top-3 bg-gray-700 text-white text-[10px] px-2 py-0.5 rounded-full">Em breve</span>
        </div>
      </nav>

      <div className="p-4 border-t border-gray-700">
        <Link to="/financeiro/settings" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/financeiro/settings') ? 'bg-white/10 text-brand-action font-medium' : 'text-gray-300 hover:bg-white/5'}`}>
          <Settings size={20} />
          Configurações
        </Link>
      </div>
    </div>
  );
};
