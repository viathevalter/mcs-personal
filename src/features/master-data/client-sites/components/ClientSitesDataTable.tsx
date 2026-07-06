import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useClientSites } from '../hooks/useClientSites';
import { ClientSiteSheet } from './ClientSiteSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Edit, ArrowUpDown } from 'lucide-react';
import type { ClientSite } from '../types';

export function ClientSitesDataTable() {
  const { t } = useTranslation();
  const { data: sites = [], isLoading } = useClientSites();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<ClientSite | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<'name' | 'client' | 'city' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.client?.trade_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (field: 'name' | 'client' | 'city') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedSites = [...filteredSites].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = '';
    let bVal = '';
    
    if (sortField === 'client') {
      aVal = a.client?.trade_name || '';
      bVal = b.client?.trade_name || '';
    } else {
      aVal = a[sortField] || '';
      bVal = b[sortField] || '';
    }
    
    aVal = aVal.toLowerCase().trim();
    bVal = bVal.toLowerCase().trim();
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleEdit = (site: ClientSite) => {
    setSelectedSite(site);
    setSheetOpen(true);
  };

  const handleNew = () => {
    setSelectedSite(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('masterData.sites.searchPlaceholder', { defaultValue: 'Buscar por nome, cliente ou cidade...' })}
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew}>
          <MapPin className="h-4 w-4 mr-2" />
          {t('masterData.sites.btnNew', { defaultValue: 'Nova Obra' })}
        </Button>
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-slate-50 border-b sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)]">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.sites.siteName', { defaultValue: 'Nome da Obra' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'name' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('client')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.client', { defaultValue: 'Cliente' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'client' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('city')}>
                  <div className="flex items-center gap-1">
                    {t('masterData.fields.location', { defaultValue: 'Localização' })}
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'city' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500">{t('masterData.sites.contactSite', { defaultValue: 'Contato (Obra)' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500">{t('masterData.fields.status', { defaultValue: 'Status' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">{t('common.loading', { defaultValue: 'Carregando...' })}</td></tr>
              ) : sortedSites.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{t('masterData.sites.noSites', { defaultValue: 'Nenhuma obra encontrada.' })}</td></tr>
              ) : (
                sortedSites.map((site) => (
                  <tr 
                    key={site.id} 
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 active:bg-slate-100"
                    onClick={() => handleEdit(site)}
                  >
                    <td className="px-4 py-3 font-medium">{site.name}</td>
                    <td className="px-4 py-3">
                      {site.client?.trade_name || <span className="text-muted-foreground italic">{t('masterData.sites.noClient', { defaultValue: 'Sem cliente' })}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {site.city}{site.city && site.country ? ', ' : ''}{site.country}
                      {!site.city && !site.country && <span>--</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div className="flex flex-col text-xs">
                        {site.contact_name && <span>{site.contact_name}</span>}
                        {site.contact_phone && <span>{site.contact_phone}</span>}
                        {!site.contact_name && !site.contact_phone && <span>--</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {site.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{t('masterData.sites.status_active', { defaultValue: 'Em Andamento' })}</Badge>}
                      {site.status === 'inactive' && <Badge variant="secondary">{t('masterData.sites.status_inactive', { defaultValue: 'Paralisada' })}</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(site)}>
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

      <ClientSiteSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        site={selectedSite} 
      />
    </div>
  );
}
