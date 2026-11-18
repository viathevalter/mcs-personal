import React from 'react';
import { Outlet } from 'react-router-dom';
import { AlmacenSidebar } from '../components/AlmacenSidebar';
import { Header } from '@/features/logistica/components/Header';
import { SidebarProvider, useSidebar } from '@/features/operacoes/contexts/SidebarContext';
import { AuthProvider } from '@/features/operacoes/contexts/AuthContext';

const AlmacenContent: React.FC = () => {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <AlmacenSidebar />
      <main
        className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <Header />
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export const AlmacenLayout: React.FC = () => {
  return (
    <AuthProvider>
      <SidebarProvider>
        <AlmacenContent />
      </SidebarProvider>
    </AuthProvider>
  );
};
