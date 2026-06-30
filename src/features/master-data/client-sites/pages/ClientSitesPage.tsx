import { ClientSitesDataTable } from '../components/ClientSitesDataTable';

export function ClientSitesPage() {
  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Obras e Locais</h1>
        <p className="text-muted-foreground mt-1">
          Cadastre os locais de operação vinculados aos seus clientes.
        </p>
      </div>

      <ClientSitesDataTable />
    </div>
  );
}
