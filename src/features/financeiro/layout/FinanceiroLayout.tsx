import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { SidebarProvider, useSidebar } from '@/features/operacoes/contexts/SidebarContext';
import { AuthProvider } from '@/features/operacoes/contexts/AuthContext';
import { DataProvider } from '../context/DataContext';

const FinanceiroContent: React.FC = () => {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Sidebar />
      <main className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header />
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-6 lg:p-8">
            <Outlet />
        </div>
      </main>
    </div>
  );
}

export const FinanceiroLayout: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <SidebarProvider>
          <FinanceiroContent />
        </SidebarProvider>
      </DataProvider>
    </AuthProvider>
  );
};
