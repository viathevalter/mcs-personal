
import { useParams, useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, MapPin, Users, Wallet, History, ShieldCheck, Percent } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Placeholders for the tabs content
import { ClientGeneralTab } from '../components/tabs/ClientGeneralTab';
import { ClientSitesTab } from '../components/tabs/ClientSitesTab';
import { ClientFinanceTab } from '../components/tabs/ClientFinanceTab';
import { ClientContactsTab } from '../components/tabs/ClientContactsTab';
import { ClientHistoryTab } from '../components/tabs/ClientHistoryTab';
import { ClientViesTab } from '../components/tabs/ClientViesTab';
import { ClientTariffsTab } from '../components/tabs/ClientTariffsTab';

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: clients, isLoading } = useClients();

  const client = clients?.find(c => c.id === id);

  if (isLoading) {
    return <div className="p-8 text-center">Carregando detalhes do cliente...</div>;
  }

  if (!client) {
    return (
      <div className="p-8 text-center space-y-4">
        <div>Cliente não encontrado.</div>
        <Button onClick={() => navigate('/master-data/clients')} variant="outline">
          Voltar para a lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate('/master-data/clients')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.trade_name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {client.legal_name} • NIF: {client.tax_id}
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            Dados Gerais
          </TabsTrigger>
          <TabsTrigger value="sites" className="gap-2">
            <MapPin className="h-4 w-4" />
            Obras / Locais
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="h-4 w-4" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="vies" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Fiscal / VIES
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2">
            <Wallet className="h-4 w-4" />
            Financeiro / Faturamento
          </TabsTrigger>
          <TabsTrigger value="tariffs" className="gap-2">
            <Percent className="h-4 w-4" />
            Tabela de Tarifas
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <ClientGeneralTab client={client} />
        </TabsContent>
        
        <TabsContent value="sites" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <ClientSitesTab clientId={client.id!} />
        </TabsContent>

        <TabsContent value="contacts" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <ClientContactsTab clientId={client.id!} />
        </TabsContent>

        <TabsContent value="vies" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <ClientViesTab client={client} />
        </TabsContent>

        <TabsContent value="finance" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <ClientFinanceTab client={client} />
        </TabsContent>

        <TabsContent value="tariffs" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <ClientTariffsTab client={client} />
        </TabsContent>

        <TabsContent value="history" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <ClientHistoryTab client={client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
