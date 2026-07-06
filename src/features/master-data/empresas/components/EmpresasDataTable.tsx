import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmpresasList } from '../hooks/useEmpresas';
import { EmpresaSheet } from './EmpresaSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building, Edit, ArrowUpDown } from 'lucide-react';
import type { Empresa } from '../types';

export function EmpresasDataTable() {
  const { t } = useTranslation();
  const { data: empresas = [], isLoading } = useEmpresasList();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<'codigo' | 'nome' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredEmpresas = empresas.filter(e => 
    (e.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (e.codigo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: 'codigo' | 'nome') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedEmpresas = [...filteredEmpresas].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] || '').toString().toLowerCase().trim();
    const bVal = (b[sortField] || '').toString().toLowerCase().trim();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleEdit = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setSheetOpen(true);
  };

  const handleNew = () => {
    setSelectedEmpresa(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('masterData.empresas.searchPlaceholder', { defaultValue: 'Buscar por nome ou código...' })}
            className="pl-8 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus-visible:ring-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/10">
          <Building className="h-4 w-4 mr-2" />
          {t('masterData.empresas.btnNew', { defaultValue: 'Nova Empresa' })}
        </Button>
      </div>

      <div className="border rounded-xl bg-white dark:bg-slate-900/50 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none" onClick={() => handleSort('codigo')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.code', { defaultValue: 'Código' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'codigo' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none" onClick={() => handleSort('nome')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.empresas.companyName', { defaultValue: 'Nome da Empresa' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'nome' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.fields.status', { defaultValue: 'Status' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">{t('common.loading', { defaultValue: 'Carregando...' })}</td></tr>
              ) : sortedEmpresas.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">{t('masterData.empresas.noCompanies', { defaultValue: 'Nenhuma empresa encontrada.' })}</td></tr>
              ) : (
                sortedEmpresas.map((empresa) => (
                  <tr 
                    key={empresa.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 active:bg-slate-100 dark:active:bg-slate-800/70"
                    onClick={() => handleEdit(empresa)}
                  >
                    <td className="px-4 py-3 font-medium dark:text-slate-200">{empresa.codigo}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">{empresa.nome}</td>
                    <td className="px-4 py-3">
                      {empresa.is_active 
                          ? <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100">{t('masterData.status.active', { defaultValue: 'Ativa' })}</Badge>
                          : <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">{t('masterData.status.inactive', { defaultValue: 'Inativa' })}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)}>
                        <Edit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmpresaSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        empresa={selectedEmpresa} 
      />
    </div>
  );
}
