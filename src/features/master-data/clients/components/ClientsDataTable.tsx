import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { usePaymentTerms } from '../hooks/usePaymentTerms';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';
import { useCountries } from '../../locations/hooks/useLocations';
import { ClientSheet } from './ClientSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, Edit, Filter, ArrowUpDown } from 'lucide-react';
import type { Client } from '../types';

export function ClientsDataTable() {
  const { t } = useTranslation();
  const { data: clients = [], isLoading } = useClients();
  const { data: paymentTerms = [] } = usePaymentTerms();
  const { data: allSites = [] } = useClientSites();
  const { data: countries = [] } = useCountries();

  const [searchTerm, setSearchTerm] = useState('');
  const [paymentTermFilter, setPaymentTermFilter] = useState<string>('all');
  const [sitesFilter, setSitesFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'codigo' | 'trade_name' | 'legal_name' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const clientIdsWithSites = new Set(allSites.map(s => s.client_id).filter(Boolean));

  const filteredClients = clients.filter(c => {
    // 1. Text Search Filter
    const matchesSearch = 
      (c.trade_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (c.legal_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (c.tax_id || '').includes(searchTerm);

    if (!matchesSearch) return false;

    // 2. Payment Term Filter
    if (paymentTermFilter === 'none') {
      if (c.payment_term_id) return false;
    } else if (paymentTermFilter !== 'all') {
      if (c.payment_term_id !== paymentTermFilter) return false;
    }

    // 3. Client Sites Filter
    if (sitesFilter === 'with') {
      if (!clientIdsWithSites.has(c.id)) return false;
    } else if (sitesFilter === 'without') {
      if (clientIdsWithSites.has(c.id)) return false;
    }

    // 4. Country Filter
    if (countryFilter !== 'all') {
      if (c.country_id !== countryFilter) return false;
    }

    return true;
  });

  const handleSort = (field: 'codigo' | 'trade_name' | 'legal_name') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = (a[sortField] || '').toString().toLowerCase().trim();
    const bVal = (b[sortField] || '').toString().toLowerCase().trim();
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleEdit = (client: Client) => {
    navigate(`/master-data/clients/${client.id}`);
  };

  const handleNew = () => {
    setSelectedClient(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 dark:bg-slate-900/50 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('masterData.clientes.searchPlaceholder', { defaultValue: 'Buscar por nome ou NIF...' })}
              className="pl-8 focus-visible:ring-orange-500 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Payment Term Select */}
          <div className="w-full sm:w-56">
            <Select value={paymentTermFilter} onValueChange={setPaymentTermFilter}>
              <SelectTrigger className="bg-white focus-visible:ring-orange-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                <SelectValue placeholder={t('masterData.sidebar.prazos', { defaultValue: 'Prazos de Pagamento' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('masterData.clientes.allTerms', { defaultValue: 'Todos os Prazos' })}</SelectItem>
                <SelectItem value="none">{t('masterData.clientes.noTerm', { defaultValue: 'Sem Prazo Cadastrado' })}</SelectItem>
                {paymentTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sites Select */}
          <div className="w-full sm:w-48">
            <Select value={sitesFilter} onValueChange={setSitesFilter}>
              <SelectTrigger className="bg-white focus-visible:ring-orange-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                <SelectValue placeholder={t('masterData.sidebar.obras', { defaultValue: 'Obras / Locais' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('masterData.clientes.allSites', { defaultValue: 'Todas as Obras' })}</SelectItem>
                <SelectItem value="with">{t('masterData.clientes.withSite', { defaultValue: 'Com Obra Cadastrada' })}</SelectItem>
                <SelectItem value="without">{t('masterData.clientes.withoutSite', { defaultValue: 'Sem Obra Cadastrada' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Country Filter */}
          <div className="w-full sm:w-48">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="bg-white focus-visible:ring-orange-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
                <SelectValue placeholder={t('masterData.sidebar.paises', { defaultValue: 'Países' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('masterData.clientes.allCountries', { defaultValue: 'Todos os Países' })}</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleNew} className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg shadow-orange-500/10 w-full sm:w-auto shrink-0">
          <Building2 className="h-4 w-4 mr-2" />
          {t('masterData.clientes.btnNew', { defaultValue: 'Novo Cliente' })}
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
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.fields.country', { defaultValue: 'País' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-center">{t('masterData.fields.sites', { defaultValue: 'Obras' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.fields.contact', { defaultValue: 'Contato' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">{t('masterData.fields.status', { defaultValue: 'Status' })}</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400 text-right">{t('masterData.fields.actions', { defaultValue: 'Ações' })}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">{t('common.loading', { defaultValue: 'Carregando...' })}</td></tr>
              ) : sortedClients.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">{t('masterData.clientes.noClients', { defaultValue: 'Nenhum cliente encontrado.' })}</td></tr>
              ) : (
                sortedClients.map((client) => {
                  const siteCount = allSites.filter(s => s.client_id === client.id).length;
                  const countryName = countries.find(co => co.id === client.country_id)?.name || '--';
                  return (
                    <tr 
                      key={client.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors duration-150 active:bg-slate-100 dark:active:bg-slate-800/70"
                      onClick={() => handleEdit(client)}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-xs">{client.codigo || '--'}</td>
                      <td className="px-4 py-3 font-medium dark:text-slate-200">{client.trade_name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{client.legal_name}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{client.tax_id || '--'}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-semibold text-xs">{countryName}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="bg-orange-50/30 text-orange-700 border-orange-200/50 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30">
                          {siteCount} {siteCount === 1 ? t('masterData.clientes.site', { defaultValue: 'obra' }) : t('masterData.clientes.sites', { defaultValue: 'obras' })}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col text-xs">
                          {client.email && <span>{client.email}</span>}
                          {client.phone && <span>{client.phone}</span>}
                          {!client.email && !client.phone && <span>--</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {client.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100">{t('masterData.status.active_masc', { defaultValue: 'Ativo' })}</Badge>}
                        {client.status === 'inactive' && <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300">{t('masterData.status.inactive_masc', { defaultValue: 'Inativo' })}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                          <Edit className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        client={selectedClient} 
      />
    </div>
  );
}
