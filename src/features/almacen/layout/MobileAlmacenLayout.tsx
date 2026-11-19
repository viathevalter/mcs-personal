import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { PackageSearch, Monitor, LogOut } from 'lucide-react';
import { supabase } from '@/shared/supabase/client';
import { AuthProvider } from '@/features/operacoes/contexts/AuthContext';

export const MobileAlmacenLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        {/* Mobile App Top Bar */}
        <header className="sticky top-0 z-30 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <PackageSearch className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">MCS Almacén</div>
              <div className="text-[10px] text-emerald-400 font-medium">App Operador Móvil</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/almacen/demandas')}
              title="Abrir versão Desktop"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
            >
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Content Area (Full Width, Touch Friendly) */}
        <main className="flex-1 w-full max-w-xl mx-auto p-3.5 pb-12">
          <Outlet />
        </main>
      </div>
    </AuthProvider>
  );
};
