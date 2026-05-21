import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/features/master-data/clients/hooks/useClients';
import { useClientSites } from '@/features/master-data/client-sites/hooks/useClientSites';

interface Props {
  data: any;
  onChange: (data: Partial<any>) => void;
}

export function EstimacionGeneralStep({ data, onChange }: Props) {
  const { data: clients = [], isLoading: isLoadingClients } = useClients();
  const { data: sites = [], isLoading: isLoadingSites } = useClientSites(data.client_id || undefined);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Dados Gerais da Proposta</h2>
        <p className="text-sm text-muted-foreground">Defina o cliente, obra e informações básicas do orçamento.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="client_id">Cliente <span className="text-red-500">*</span></Label>
          <Select 
            value={data.client_id} 
            onValueChange={(val) => onChange({ client_id: val, client_site_id: '' })}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoadingClients ? 'Carregando...' : 'Selecione o Cliente'} />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>{client.trade_name || client.legal_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="client_site_id">Obra / Local</Label>
          <Select 
            value={data.client_site_id} 
            onValueChange={(val) => onChange({ client_site_id: val })}
            disabled={!data.client_id || isLoadingSites}
          >
            <SelectTrigger>
              <SelectValue placeholder={!data.client_id ? 'Selecione um cliente primeiro' : 'Selecione a Obra'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhuma Obra Específica</SelectItem>
              {sites.map(site => (
                <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimation_type">Tipo de Pedido</Label>
          <Select 
            value={data.estimation_type} 
            onValueChange={(val) => onChange({ estimation_type: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_allocation">Nova Alocação</SelectItem>
              <SelectItem value="expansion">Expansão de Escopo</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_terms">Condições de Pagamento</Label>
          <Select 
            value={data.payment_terms} 
            onValueChange={(val) => onChange({ payment_terms: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15 dias">15 Dias</SelectItem>
              <SelectItem value="30 dias">30 Dias</SelectItem>
              <SelectItem value="45 dias">45 Dias</SelectItem>
              <SelectItem value="60 dias">60 Dias</SelectItem>
              <SelectItem value="Pronto Pagamento">Pronto Pagamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_name">Nome do Contato</Label>
          <Input 
            id="contact_name"
            placeholder="Ex: Carlos Silva"
            value={data.contact_name}
            onChange={(e) => onChange({ contact_name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact_email">Email do Contato</Label>
          <Input 
            id="contact_email"
            type="email"
            placeholder="Ex: carlos@empresa.com"
            value={data.contact_email}
            onChange={(e) => onChange({ contact_email: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_start_date">Data Prevista de Início</Label>
          <Input 
            id="expected_start_date"
            type="date"
            value={data.expected_start_date}
            onChange={(e) => onChange({ expected_start_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="validity_date">Validade da Proposta</Label>
          <Input 
            id="validity_date"
            type="date"
            value={data.validity_date}
            onChange={(e) => onChange({ validity_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="general_notes">Observações Gerais</Label>
        <Textarea 
          id="general_notes"
          placeholder="Condições especiais, restrições ou contexto da proposta..."
          className="min-h-[100px]"
          value={data.general_notes}
          onChange={(e) => onChange({ general_notes: e.target.value })}
        />
      </div>
    </div>
  );
}
