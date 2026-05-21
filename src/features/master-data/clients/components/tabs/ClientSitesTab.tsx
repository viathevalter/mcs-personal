import { useState } from 'react';
import { useClientSites } from '../../../client-sites/hooks/useClientSites';
import { Button } from '@/components/ui/button';
import { MapPin, Edit, Plus } from 'lucide-react';
import { ClientSiteSheet } from '../../../client-sites/components/ClientSiteSheet';
import { Badge } from '@/components/ui/badge';
import type { ClientSite } from '../../../client-sites/types';

interface ClientSitesTabProps {
  clientId: string;
}

export function ClientSitesTab({ clientId }: ClientSitesTabProps) {
  const { data: clientSites = [], isLoading } = useClientSites();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<ClientSite | null>(null);

  // Filter sites for this specific client
  const sites = clientSites.filter(site => site.client_id === clientId);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Obras e Locais de Operação</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os locais onde este cliente possui operações ativas.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Obra
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-500">Nome / Local</th>
              <th className="px-4 py-3 font-medium text-slate-500">Código</th>
              <th className="px-4 py-3 font-medium text-slate-500">Endereço</th>
              <th className="px-4 py-3 font-medium text-slate-500">Contato (Obra)</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando locais...</td></tr>
            ) : sites.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma obra cadastrada para este cliente.</td></tr>
            ) : (
              sites.map((site) => (
                <tr key={site.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {site.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{site.site_code || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {site.city || site.province ? `${site.city || ''}${site.city && site.province ? ' - ' : ''}${site.province || ''}` : 'Não informado'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    <div className="flex flex-col text-xs">
                      {site.contact_name && <span>{site.contact_name}</span>}
                      {site.contact_phone && <span>{site.contact_phone}</span>}
                      {!site.contact_name && !site.contact_phone && <span>--</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {site.status === 'active' && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Ativa</Badge>}
                    {site.status === 'inactive' && <Badge variant="secondary">Inativa</Badge>}
                    {site.status === 'archived' && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Concluída</Badge>}
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
        preSelectedClientId={clientId}
      />
    </div>
  );
}
