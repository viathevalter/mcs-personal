import { ClientsDataTable } from '../components/ClientsDataTable';

export function ClientsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
        <p className="text-muted-foreground mt-1">
          Cadastre e gerencie as empresas clientes do grupo.
        </p>
      </div>

      <ClientsDataTable />
    </div>
  );
}
