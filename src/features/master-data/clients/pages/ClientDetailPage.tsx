
import { useParams, useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, MapPin, Users, Wallet, History } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Placeholders for the tabs content
import { ClientGeneralTab } from '../components/tabs/ClientGeneralTab';
import { ClientSitesTab } from '../components/tabs/ClientSitesTab';

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
    <div className="space-y-6 max-w-7xl mx-auto p-6">
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
          <TabsTrigger value="finance" className="gap-2">
            <Wallet className="h-4 w-4" />
            Financeiro / Faturamento
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
          <div className="text-center py-10 text-muted-foreground">
            <Users className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium">Contatos do Cliente</h3>
            <p>Este módulo será implementado na próxima fase.</p>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <div className="text-center py-10 text-muted-foreground">
            <Wallet className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium">Dados Financeiros</h3>
            <p>Configurações de faturamento e limites de crédito serão implementados no Bloco 4 (Comercial/Faturamento).</p>
          </div>
        </TabsContent>

        <TabsContent value="history" className="border rounded-md bg-white p-6 dark:bg-slate-900 shadow-sm">
          <div className="text-center py-10 text-muted-foreground">
            <History className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <h3 className="text-lg font-medium">Histórico de Alterações</h3>
            <p>Log de auditoria em desenvolvimento.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
