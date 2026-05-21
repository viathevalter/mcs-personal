import { useState } from 'react';
import { useClientSites } from '../hooks/useClientSites';
import { ClientSiteSheet } from './ClientSiteSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Edit } from 'lucide-react';
import type { ClientSite } from '../types';

export function ClientSitesDataTable() {
  const { data: sites = [], isLoading } = useClientSites();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<ClientSite | null>(null);

  const filteredSites = sites.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.client?.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            placeholder="Buscar por nome, cliente ou cidade..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew}>
          <MapPin className="h-4 w-4 mr-2" />
          Nova Obra
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-500">Nome da Obra</th>
              <th className="px-4 py-3 font-medium text-slate-500">Cliente</th>
              <th className="px-4 py-3 font-medium text-slate-500">Localização</th>
              <th className="px-4 py-3 font-medium text-slate-500">Contato (Obra)</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filteredSites.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma obra encontrada.</td></tr>
            ) : (
              filteredSites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{site.name}</td>
                  <td className="px-4 py-3">
                    {site.client?.trade_name || <span className="text-muted-foreground italic">Sem cliente</span>}
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
                    {site.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Em Andamento</Badge>}
                    {site.status === 'inactive' && <Badge variant="secondary">Paralisada</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
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

      <ClientSiteSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        site={selectedSite} 
      />
    </div>
  );
}
