import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { ClientSheet } from './ClientSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Edit } from 'lucide-react';
import type { Client } from '../types';

export function ClientsDataTable() {
  const { data: clients = [], isLoading } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = clients.filter(c => 
    c.trade_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.legal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.tax_id.includes(searchTerm)
  );

  const handleEdit = (client: Client) => {
    navigate(`/master-data/clients/${client.id}`);
  };

  const handleNew = () => {
    setSelectedClient(null);
    setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou NIF..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleNew}>
          <Building2 className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="border rounded-md bg-white">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-slate-500">Nome Fantasia</th>
              <th className="px-4 py-3 font-medium text-slate-500">Razão Social</th>
              <th className="px-4 py-3 font-medium text-slate-500">NIF</th>
              <th className="px-4 py-3 font-medium text-slate-500">Contato</th>
              <th className="px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="px-4 py-3 font-medium text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Carregando...</td></tr>
            ) : filteredClients.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{client.trade_name}</td>
                  <td className="px-4 py-3 text-slate-500">{client.legal_name}</td>
                  <td className="px-4 py-3 text-slate-500">{client.tax_id}</td>
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
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}>
                      <Edit className="h-4 w-4 text-slate-500" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ClientSheet 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
        client={selectedClient} 
      />
    </div>
  );
}
