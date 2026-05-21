import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
