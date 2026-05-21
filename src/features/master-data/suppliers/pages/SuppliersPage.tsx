import { SuppliersDataTable } from '../components/SuppliersDataTable';

export function SuppliersPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Fornecedores</h1>
        <p className="text-muted-foreground mt-1">
          Cadastre os parceiros de negócio e fornecedores do grupo.
        </p>
      </div>

      <SuppliersDataTable />
    </div>
  );
}
