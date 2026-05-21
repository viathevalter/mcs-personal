import React, { useState } from 'react';
import { useOpenPositions } from './hooks/useOpenPositions';
import type { OpenPosition } from './hooks/useOpenPositions';
import { OpenPositionsTable } from './components/OpenPositionsTable';
import { AllocateWorkerDialog } from './components/AllocateWorkerDialog';
import { Briefcase, Users, Clock } from 'lucide-react';

export const HiringDashboardPage: React.FC = () => {
  const { data: openPositions = [], isLoading } = useOpenPositions();
  
  const [selectedPosition, setSelectedPosition] = useState<OpenPosition | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalVagasAbertas = openPositions.reduce((acc, pos) => acc + (pos.quantity_requested - pos.quantity_fulfilled), 0);
  const pedidosPendentes = new Set(openPositions.map(p => p.pedido_id)).size;

  const handleAllocate = (position: OpenPosition) => {
    setSelectedPosition(position);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Contratação Inicial</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Aloque trabalhadores para as vagas abertas dos pedidos comerciais.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Vagas em Aberto</h3>
            <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{isLoading ? '-' : totalVagasAbertas}</p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Pedidos Pendentes</h3>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase size={18} />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-4">{isLoading ? '-' : pedidosPendentes}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Posições em Aberto</h2>
          <span className="inline-flex items-center justify-center h-6 px-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold">
            {openPositions.length}
          </span>
        </div>
        
        {isLoading ? (
          <div className="h-64 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-slate-500">
              <Clock className="animate-spin h-5 w-5" />
              <span>Carregando vagas...</span>
            </div>
          </div>
        ) : (
          <OpenPositionsTable positions={openPositions} onAllocate={handleAllocate} />
        )}
      </div>

      <AllocateWorkerDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        position={selectedPosition} 
      />
    </div>
  );
};
