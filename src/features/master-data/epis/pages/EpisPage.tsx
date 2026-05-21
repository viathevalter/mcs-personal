import { useState } from 'react';
import { useEpis } from '../hooks/useEpis';
import { EpiSheet } from '../components/EpiSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, HardHat } from 'lucide-react';
import type { Epi } from '../types';

export function EpisPage() {
  const { data: epis = [], isLoading } = useEpis();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEpi, setSelectedEpi] = useState<Epi | null>(null);

  const filteredEpis = epis.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.code && e.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEdit = (epi: Epi) => {
    setSelectedEpi(epi);
    setSheetOpen(true);
  };

  const handleNew = () => {
    setSelectedEpi(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de EPIs</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie o catálogo de Equipamentos de Proteção Individual disponíveis para atribuição.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou código..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew} className="gap-2">
          <HardHat className="h-4 w-4" />
          Novo EPI
        </Button>
      </div>

      <div className="border rounded-md bg-white dark:bg-slate-900">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Código</th>
              <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Nome / Descrição</th>
              <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Categoria</th>
              <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Custo (€)</th>
              <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando catálogo...</td></tr>
            ) : filteredEpis.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum EPI encontrado.</td></tr>
            ) : (
              filteredEpis.map((epi) => (
                <tr key={epi.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-xs">{epi.code || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{epi.name}</div>
                    {epi.description && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{epi.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{epi.category || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {epi.default_cost ? epi.default_cost.toFixed(2) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {epi.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ativo</Badge>}
                    {epi.status === 'inactive' && <Badge variant="secondary">Inativo</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(epi)}>
                      <Edit className="h-4 w-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EpiSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        epi={selectedEpi} 
      />
    </div>
  );
}
