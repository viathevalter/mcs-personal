import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuppliers } from '../hooks/useSuppliers';
import { SupplierSheet } from './SupplierSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Truck, Edit, ArrowUpDown } from 'lucide-react';
import type { Supplier } from '../types';

export function SuppliersDataTable() {
  const { t } = useTranslation();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<'trade_name' | 'legal_name' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredSuppliers = suppliers.filter(s => 
    (s.trade_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (s.legal_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (s.tax_id || '').includes(searchTerm)
  );

  const handleSort = (field: 'trade_name' | 'legal_name') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] || '').toString().toLowerCase().trim();
    const bVal = (b[sortField] || '').toString().toLowerCase().trim();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setSheetOpen(true);
  };

  const handleNew = () => {
    setSelectedSupplier(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('masterData.clientes.searchPlaceholder', { defaultValue: 'Buscar por nome ou NIF...' })}
            className="pl-8 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus-visible:ring-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/10">
          <Truck className="h-4 w-4 mr-2" />
          {t('masterData.suppliers.btnNew', { defaultValue: 'Novo Fornecedor' })}
        </Button>
      </div>

      <div className="border rounded-xl bg-white dark:bg-slate-900/50 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)] dark:shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none" onClick={() => handleSort('trade_name')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.name_fantasy', { defaultValue: 'Nome Fantasia' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'trade_name' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none" onClick={() => handleSort('legal_name')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.social_reason', { defaultValue: 'Razão Social' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'legal_name' ? 'text-orange-500 scale-110' : 'text-slate-400 dark:text-slate-500 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.fields.nif', { defaultValue: 'NIF' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.suppliers.category', { defaultValue: 'Categoria' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.fields.status', { defaultValue: 'Status' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">{t('common.loading', { defaultValue: 'Carregando...' })}</td></tr>
              ) : sortedSuppliers.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('masterData.suppliers.noSuppliers', { defaultValue: 'Nenhum fornecedor encontrado.' })}</td></tr>
              ) : (
                sortedSuppliers.map((supplier) => (
                  <tr 
                    key={supplier.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 active:bg-slate-100 dark:active:bg-slate-800/70"
                    onClick={() => handleEdit(supplier)}
                  >
                    <td className="px-4 py-3 font-medium dark:text-slate-200">{supplier.trade_name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{supplier.legal_name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{supplier.tax_id || '--'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {supplier.supplier_type || '--'}
                    </td>
                    <td className="px-4 py-3">
                      {supplier.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100">{t('masterData.status.active_masc', { defaultValue: 'Ativo' })}</Badge>}
                      {supplier.status === 'inactive' && <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">{t('masterData.status.inactive_masc', { defaultValue: 'Inativo' })}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
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

      <SupplierSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        supplier={selectedSupplier} 
      />
    </div>
  );
}
