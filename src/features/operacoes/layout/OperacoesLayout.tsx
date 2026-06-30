import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import type { Filters } from '../services/types';
import { SidebarProvider, useSidebar } from '../contexts/SidebarContext';
import { AuthProvider } from '../contexts/AuthContext';

const OperacoesContent: React.FC = () => {
  const { isSidebarOpen } = useSidebar();
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [filters, setFilters] = useState<Filters>({
    monthRange: [currentMonth, currentMonth],
    empresa: null,
    comercial: null,
    cliente: null,
    status: null,
    pais: null
  });

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Sidebar />
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header />
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 lg:p-8">
            <Outlet context={{ filters, setFilters }} />
        </div>
      </main>
    </div>
  );
}

export const OperacoesLayout: React.FC = () => {
  return (
    <AuthProvider>
      <SidebarProvider>
        <OperacoesContent />
      </SidebarProvider>
    </AuthProvider>
  );
};
