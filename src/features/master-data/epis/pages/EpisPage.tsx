import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEpis } from '../hooks/useEpis';
import { EpiSheet } from '../components/EpiSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, HardHat, ArrowUpDown } from 'lucide-react';
import type { Epi } from '../types';

export function EpisPage() {
  const { t } = useTranslation();
  const { data: epis = [], isLoading } = useEpis();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEpi, setSelectedEpi] = useState<Epi | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<'code' | 'name' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredEpis = epis.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.code && e.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSort = (field: 'code' | 'name') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedEpis = [...filteredEpis].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] || '').toString().toLowerCase().trim();
    const bVal = (b[sortField] || '').toString().toLowerCase().trim();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleEdit = (epi: Epi) => {
    setSelectedEpi(epi);
    setSheetOpen(true);
  };

  const handleNew = () => {
    setSelectedEpi(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('masterData.epis.title', { defaultValue: 'Catálogo de EPIs' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('masterData.epis.subtitle', { defaultValue: 'Gerencie o catálogo de Equipamentos de Proteção Individual disponíveis para atribuição.' })}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('masterData.empresas.searchPlaceholder', { defaultValue: 'Buscar por nome ou código...' })}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew} className="gap-2">
          <HardHat className="h-4 w-4" />
          {t('masterData.epis.btnNew', { defaultValue: 'Novo EPI' })}
        </Button>
      </div>

      <div className="border rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)]">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('code')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.code', { defaultValue: 'Código' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'code' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.epis.nameDesc', { defaultValue: 'Nome / Descrição' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'name' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.suppliers.category', { defaultValue: 'Categoria' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">{t('masterData.epis.cost', { defaultValue: 'Custo (€)' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.fields.status', { defaultValue: 'Status' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('masterData.epis.loading', { defaultValue: 'Carregando catálogo...' })}</td></tr>
              ) : sortedEpis.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('masterData.epis.noEpis', { defaultValue: 'Nenhum EPI encontrado.' })}</td></tr>
              ) : (
                sortedEpis.map((epi) => (
                  <tr 
                    key={epi.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors duration-150 active:bg-slate-100 dark:active:bg-slate-800"
                    onClick={() => handleEdit(epi)}
                  >
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
                      {epi.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{t('masterData.status.active', { defaultValue: 'Ativa' })}</Badge>}
                      {epi.status === 'inactive' && <Badge variant="secondary">{t('masterData.status.inactive', { defaultValue: 'Inativa' })}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
      </div>

      <EpiSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        epi={selectedEpi} 
      />
    </div>
  );
}
