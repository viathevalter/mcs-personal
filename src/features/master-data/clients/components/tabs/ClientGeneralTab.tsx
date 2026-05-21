import type { Client } from '../../types';
import { ClientForm } from '../ClientForm';

interface ClientGeneralTabProps {
  client: Client;
}

export function ClientGeneralTab({ client }: ClientGeneralTabProps) {
  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-6">Informações Gerais do Cliente</h2>
      <ClientForm client={client} />
    </div>
  );
}
