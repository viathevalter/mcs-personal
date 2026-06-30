import { EmpresasDataTable } from '../components/EmpresasDataTable';

export function EmpresasPage() {
  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Empresas</h1>
        <p className="text-muted-foreground mt-1">
          Cadastre as Entidades Legais (Empresas) do grupo Mastercorp.
        </p>
      </div>

      <EmpresasDataTable />
    </div>
  );
}
