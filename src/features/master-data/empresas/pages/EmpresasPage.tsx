import { useTranslation } from 'react-i18next';
import { EmpresasDataTable } from '../components/EmpresasDataTable';

export function EmpresasPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 w-full px-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('masterData.empresas.title', { defaultValue: 'Gestão de Empresas' })}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('masterData.empresas.subtitle', { defaultValue: 'Cadastre as Entidades Legais (Empresas) do grupo Mastercorp.' })}
        </p>
      </div>

      <EmpresasDataTable />
    </div>
  );
}
