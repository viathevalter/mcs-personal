import { useState } from 'react';
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
              placeholder="Buscar por nome ou NIF..."
              className="pl-8 focus-visible:ring-orange-500 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Payment Term Select */}
          <div className="w-full sm:w-56">
            <Select value={paymentTermFilter} onValueChange={setPaymentTermFilter}>
              <SelectTrigger className="bg-white focus-visible:ring-orange-500">
                <SelectValue placeholder="Prazos de Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Prazos</SelectItem>
                <SelectItem value="none">Sem Prazo Cadastrado</SelectItem>
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
              <SelectTrigger className="bg-white focus-visible:ring-orange-500">
                <SelectValue placeholder="Obras / Locais" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Obras</SelectItem>
                <SelectItem value="with">Com Obra Cadastrada</SelectItem>
                <SelectItem value="without">Sem Obra Cadastrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Country Filter */}
          <div className="w-full sm:w-48">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="bg-white focus-visible:ring-orange-500">
                <SelectValue placeholder="Países" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Países</SelectItem>
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
          Novo Cliente
        </Button>
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto max-h-[calc(100vh-270px)] scrollbar-thin">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-slate-50 border-b sticky top-0 z-10 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.1)]">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('codigo')}>
                  <div className="flex items-center gap-1">
                    Código
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'codigo' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('trade_name')}>
                  <div className="flex items-center gap-1">
                    Nome Fantasia
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'trade_name' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-800 transition-colors select-none" onClick={() => handleSort('legal_name')}>
                  <div className="flex items-center gap-1">
                    Razão Social
                    <ArrowUpDown className={`h-3.5 w-3.5 transition-all ${sortField === 'legal_name' ? 'text-orange-500 scale-110' : 'text-slate-400 opacity-55'}`} />
                  </div>
                </th>
                <th className="px-4 py-3 font-medium text-slate-500">NIF</th>
                <th className="px-4 py-3 font-medium text-slate-500">País</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-center">Obras</th>
                <th className="px-4 py-3 font-medium text-slate-500">Contato</th>
                <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">Carregando...</td></tr>
              ) : sortedClients.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
              ) : (
                sortedClients.map((client) => {
                  const siteCount = allSites.filter(s => s.client_id === client.id).length;
                  const countryName = countries.find(co => co.id === client.country_id)?.name || '--';
                  return (
                    <tr 
                      key={client.id} 
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 active:bg-slate-100"
                      onClick={() => handleEdit(client)}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-slate-600 text-xs">{client.codigo || '--'}</td>
                      <td className="px-4 py-3 font-medium">{client.trade_name}</td>
                      <td className="px-4 py-3 text-slate-500">{client.legal_name}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{client.tax_id || '--'}</td>
                      <td className="px-4 py-3 text-slate-500 font-semibold text-xs">{countryName}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="bg-orange-50/30 text-orange-700 border-orange-200/50">
                          {siteCount} {siteCount === 1 ? 'obra' : 'obras'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        <div className="flex flex-col text-xs">
                          {client.email && <span>{client.email}</span>}
                          {client.phone && <span>{client.phone}</span>}
                          {!client.email && !client.phone && <span>--</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {client.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ativo</Badge>}
                        {client.status === 'inactive' && <Badge variant="secondary">Inativo</Badge>}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                          <Edit className="h-4 w-4 text-slate-500" />
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
