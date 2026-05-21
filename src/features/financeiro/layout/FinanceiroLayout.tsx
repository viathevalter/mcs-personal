import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { DataProvider } from '../context/DataContext';

export function FinanceiroLayout() {
  return (
    <DataProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gray-50 dark:bg-slate-900">
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col transition-all duration-300">
          <Navbar />
          <main className="flex-1 flex flex-col overflow-hidden relative p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </DataProvider>
  );
}
