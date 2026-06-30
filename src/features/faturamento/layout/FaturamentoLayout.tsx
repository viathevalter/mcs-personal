import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { SidebarProvider, useSidebar } from '@/features/operacoes/contexts/SidebarContext';
import { AuthProvider } from '@/features/operacoes/contexts/AuthContext';

const FaturamentoContent: React.FC = () => {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Sidebar />
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header />
        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 md:p-4 lg:p-4">
            <Outlet />
        </div>
      </main>
    </div>
  );
}

export const FaturamentoLayout: React.FC = () => {
  return (
    <AuthProvider>
      <SidebarProvider>
        <FaturamentoContent />
      </SidebarProvider>
    </AuthProvider>
  );
};
